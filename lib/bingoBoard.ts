import { BINGO_TASKS } from "@/lib/bingoTasks";

export const BOARD_SIZE = 9;

const STORAGE_KEY = "bingo-board";

/**
 * Plansza jest prywatna dla urządzenia — trzymamy ją w localStorage i nigdy
 * nie mieszamy z postępem innych gości. Nowe zadania losujemy dopiero, gdy
 * właściciel urządzenia odhaczy wszystkie swoje pola.
 */
export type BingoBoard = {
  /** Zadania widoczne na planszy (zawsze BOARD_SIZE pozycji). */
  taskIds: string[];
  /** Zadania wykonane na tym urządzeniu. */
  doneIds: string[];
  /** Zadania wylosowane w poprzednich rundach — żeby się nie powtarzały. */
  usedIds: string[];
  /** Numer rundy, rośnie po każdym pełnym bingo. */
  round: number;
};

export const hasEnoughTasks = BINGO_TASKS.length >= BOARD_SIZE;

const knownIds = new Set(BINGO_TASKS.map((task) => task.id));

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Prywatne okno / zablokowane ciasteczka — gramy bez zapisu.
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

function draw(previousUsed: string[]): { taskIds: string[]; usedIds: string[] } {
  const used = new Set(previousUsed.filter((id) => knownIds.has(id)));
  const unused = BINGO_TASKS.filter((task) => !used.has(task.id));
  const picked = shuffle(unused).slice(0, BOARD_SIZE);

  if (picked.length === BOARD_SIZE) {
    const taskIds = picked.map((task) => task.id);
    return { taskIds, usedIds: [...used, ...taskIds] };
  }

  // Pula zadań się wyczerpała — zaczynamy nowy obieg od świeżej listy.
  const pickedIds = new Set(picked.map((task) => task.id));
  const rest = shuffle(BINGO_TASKS.filter((task) => !pickedIds.has(task.id)));
  const taskIds = [...picked, ...rest.slice(0, BOARD_SIZE - picked.length)].map(
    (task) => task.id,
  );

  return { taskIds, usedIds: taskIds };
}

function createBoard(previous?: BingoBoard): BingoBoard {
  const { taskIds, usedIds } = draw(previous?.usedIds ?? []);
  return {
    taskIds,
    usedIds,
    doneIds: [],
    round: (previous?.round ?? 0) + 1,
  };
}

/**
 * Wczytuje zapis z urządzenia. Zwraca null, gdy zapis jest uszkodzony,
 * pochodzi ze starej wersji albo dotyczy zadań, których już nie ma.
 */
function parseBoard(raw: string | null): BingoBoard | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<BingoBoard>;

  if (!Array.isArray(candidate.taskIds)) return null;

  const taskIds = candidate.taskIds.filter(
    (id): id is string => typeof id === "string" && knownIds.has(id),
  );
  if (taskIds.length !== BOARD_SIZE) return null;
  if (new Set(taskIds).size !== BOARD_SIZE) return null;

  const onBoard = new Set(taskIds);
  const doneIds = Array.isArray(candidate.doneIds)
    ? [
        ...new Set(
          candidate.doneIds.filter(
            (id): id is string => typeof id === "string" && onBoard.has(id),
          ),
        ),
      ]
    : [];

  const usedIds = Array.isArray(candidate.usedIds)
    ? [
        ...new Set(
          candidate.usedIds.filter(
            (id): id is string => typeof id === "string" && knownIds.has(id),
          ),
        ),
      ]
    : [...taskIds];

  const round =
    typeof candidate.round === "number" && Number.isFinite(candidate.round)
      ? candidate.round
      : 1;

  // Stare zapisy mogły mieć dodatkowe pola (np. seenPaths) — pomijamy je.
  return { taskIds, doneIds, usedIds, round };
}

/** Zapisuje planszę. Zwraca false, gdy urządzenie nie pozwala na zapis. */
export function saveBoard(board: BingoBoard): boolean {
  const storage = store();
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(board));
    return true;
  } catch {
    // Pełna pamięć albo tryb prywatny — plansza działa tylko do odświeżenia.
    return false;
  }
}

export type LoadedBoard = {
  board: BingoBoard;
  /** false = postępu nie da się zapisać na tym urządzeniu. */
  persisted: boolean;
};

export function loadBoard(): LoadedBoard {
  if (!hasEnoughTasks) {
    return {
      board: { taskIds: [], doneIds: [], usedIds: [], round: 1 },
      persisted: false,
    };
  }

  const storage = store();

  let raw: string | null = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    raw = null;
  }

  const saved = parseBoard(raw);
  if (saved) return { board: saved, persisted: Boolean(storage) };

  const board = createBoard();
  return { board, persisted: saveBoard(board) };
}

export function nextBoard(previous: BingoBoard): BingoBoard {
  return createBoard(previous);
}

export function isBoardComplete(board: BingoBoard): boolean {
  if (board.taskIds.length === 0) return false;
  const done = new Set(board.doneIds);
  return board.taskIds.every((id) => done.has(id));
}

export function boardTasks(board: BingoBoard) {
  return board.taskIds
    .map((id) => BINGO_TASKS.find((task) => task.id === id))
    .filter((task) => task !== undefined);
}
