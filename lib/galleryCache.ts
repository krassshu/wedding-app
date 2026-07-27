import { toPhoto, type GalleryStats, type Photo } from "@/lib/photos";

export type FeedCache = {
  photos: Photo[];
  offset: number;
  hasMore: boolean;
};

const FEED_PREFIX = "gallery-feed:";
const STATS_KEY = "gallery-stats";

type StoredPhoto = [name: string, createdAt: string];
type StoredFeed = { offset: number; hasMore: boolean; items: StoredPhoto[] };
type StoredStats = {
  total: number;
  bingoTotal: number;
  cover: StoredPhoto | null;
  bingoCover: StoredPhoto | null;
};

const feeds = new Map<string, FeedCache>();
let stats: GalleryStats | null = null;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string): T | null {
  const raw = store()?.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function pack(photo: Photo): StoredPhoto {
  return [photo.name, photo.createdAt];
}

function unpack([name, createdAt]: StoredPhoto): Photo {
  return toPhoto(name, createdAt);
}

export function readFeed(key: string): FeedCache | undefined {
  const inMemory = feeds.get(key);
  if (inMemory) return inMemory;

  const stored = read<StoredFeed>(`${FEED_PREFIX}${key}`);
  if (!stored || stored.items.length === 0) return undefined;

  const restored: FeedCache = {
    photos: stored.items.map(unpack),
    offset: stored.offset,
    hasMore: stored.hasMore,
  };
  feeds.set(key, restored);
  return restored;
}

export function writeFeed(key: string, value: FeedCache): void {
  feeds.set(key, value);
  write(`${FEED_PREFIX}${key}`, {
    offset: value.offset,
    hasMore: value.hasMore,
    items: value.photos.map(pack),
  } satisfies StoredFeed);
}

export function readStats(): GalleryStats | null {
  if (stats) return stats;

  const stored = read<StoredStats>(STATS_KEY);
  if (!stored) return null;

  stats = {
    total: stored.total,
    bingoTotal: stored.bingoTotal,
    cover: stored.cover ? unpack(stored.cover) : null,
    bingoCover: stored.bingoCover ? unpack(stored.bingoCover) : null,
  };
  return stats;
}

export function writeStats(value: GalleryStats): void {
  stats = value;
  write(STATS_KEY, {
    total: value.total,
    bingoTotal: value.bingoTotal,
    cover: value.cover ? pack(value.cover) : null,
    bingoCover: value.bingoCover ? pack(value.bingoCover) : null,
  } satisfies StoredStats);
}
