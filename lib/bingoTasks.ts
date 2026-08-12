import bingoData from "@/app/data/bingo.json";
import type { BingoTask } from "@/app/types/bingo";

function isTask(value: unknown): value is BingoTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<BingoTask>;
  return (
    typeof task.id === "string" &&
    task.id.length > 0 &&
    typeof task.title === "string" &&
    task.title.trim().length > 0
  );
}

/** Zadania z pliku danych — odsiane z pozycji niekompletnych i duplikatów. */
export const BINGO_TASKS: BingoTask[] = (() => {
  const raw = (bingoData as { tasks?: unknown })?.tasks;
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const tasks: BingoTask[] = [];

  for (const item of raw) {
    if (!isTask(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    tasks.push(item);
  }

  return tasks;
})();

const byId = new Map(BINGO_TASKS.map((task) => [task.id, task]));

export function bingoTaskById(id: string | null | undefined): BingoTask | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

/** Tytuł zadania do podpisu zdjęcia. Null, gdy zadania już nie ma na liście. */
export function bingoTaskTitle(id: string | null | undefined): string | null {
  return bingoTaskById(id)?.title ?? null;
}
