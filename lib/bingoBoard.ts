import bingoData from "@/app/data/bingo.json";
import type { BingoData } from "@/app/types/bingo";

const { tasks } = bingoData as BingoData;

export const BOARD_SIZE = 9;
const STORAGE_KEY = "bingo-board";

export type BingoBoard = {
  taskIds: string[];
  doneIds: string[];
  usedIds: string[];
  seenPaths: string[];
  round: number;
};

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function shuffle<T>(input: T[]): T[] {
  const items = [...input];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function draw(usedIds: string[]): { taskIds: string[]; usedIds: string[] } {
  const used = new Set(usedIds);
  const unused = tasks.filter((task) => !used.has(task.id));
  const picked = shuffle(unused).slice(0, BOARD_SIZE);

  if (picked.length < BOARD_SIZE) {
    const pickedIds = new Set(picked.map((task) => task.id));
    const rest = shuffle(tasks.filter((task) => !pickedIds.has(task.id)));
    picked.push(...rest.slice(0, BOARD_SIZE - picked.length));
    return { taskIds: picked.map((task) => task.id), usedIds: picked.map((t) => t.id) };
  }

  const taskIds = picked.map((task) => task.id);
  return { taskIds, usedIds: [...usedIds, ...taskIds] };
}

function createBoard(previous?: BingoBoard, seenPaths: string[] = []): BingoBoard {
  const { taskIds, usedIds } = draw(previous?.usedIds ?? []);
  return {
    taskIds,
    usedIds,
    doneIds: [],
    seenPaths,
    round: (previous?.round ?? 0) + 1,
  };
}

function isValid(board: unknown): board is BingoBoard {
  if (!board || typeof board !== "object") return false;
  const candidate = board as Partial<BingoBoard>;
  const known = new Set(tasks.map((task) => task.id));
  return (
    Array.isArray(candidate.taskIds) &&
    candidate.taskIds.length === BOARD_SIZE &&
    candidate.taskIds.every((id) => known.has(id)) &&
    Array.isArray(candidate.doneIds) &&
    Array.isArray(candidate.usedIds) &&
    Array.isArray(candidate.seenPaths) &&
    typeof candidate.round === "number"
  );
}

export function loadBoard(): BingoBoard {
  const raw = store()?.getItem(STORAGE_KEY);

  if (raw) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (isValid(parsed)) return parsed;
  }

  const board = createBoard();
  saveBoard(board);
  return board;
}

export function saveBoard(board: BingoBoard): void {
  try {
    store()?.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    return;
  }
}

export function nextBoard(previous: BingoBoard, seenPaths: string[]): BingoBoard {
  const board = createBoard(previous, seenPaths);
  saveBoard(board);
  return board;
}

export function boardTasks(board: BingoBoard) {
  return board.taskIds
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task) => task !== undefined);
}
