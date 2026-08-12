"use client";

import { PartyPopper } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BingoModal from "@/app/components/bingo/BingoModal";
import BingoTitle from "@/app/components/cards/BingoTitle";
import Notice from "@/app/components/ui/Notice";
import type { BingoTask } from "@/app/types/bingo";
import {
  BOARD_SIZE,
  boardTasks,
  hasEnoughTasks,
  isBoardComplete,
  loadBoard,
  nextBoard,
  saveBoard,
  type BingoBoard,
} from "@/lib/bingoBoard";
import { useHydrated } from "@/lib/useHydrated";

export default function BingoGrid() {
  const hydrated = useHydrated();
  return hydrated ? <Board /> : <BoardSkeleton />;
}

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white">
      {Array.from({ length: BOARD_SIZE }).map((_, index) => (
        <div key={index} className="shimmer aspect-square" />
      ))}
    </div>
  );
}

function Board() {
  const [{ board, persisted }, setState] = useState(() => loadBoard());
  const [activeTask, setActiveTask] = useState<BingoTask | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (celebrationTimer.current !== null) {
        window.clearTimeout(celebrationTimer.current);
      }
    };
  }, []);

  if (!hasEnoughTasks) {
    return (
      <Notice tone="error">
        Nie udało się wczytać zadań bingo. Odśwież stronę, a jeśli to nie pomoże —
        daj znać Parze Młodej.
      </Notice>
    );
  }

  const tasks = boardTasks(board);
  const done = new Set(board.doneIds);

  /**
   * Zadanie odhaczamy tylko na tym urządzeniu. Kiedy komplet jest gotowy,
   * losujemy nową planszę — zdjęcia innych gości nic tu nie zmieniają.
   */
  function completeTask(task: BingoTask) {
    if (board.doneIds.includes(task.id)) return;

    const updated: BingoBoard = {
      ...board,
      doneIds: [...board.doneIds, task.id],
    };

    if (!isBoardComplete(updated)) {
      setState({ board: updated, persisted: saveBoard(updated) });
      return;
    }

    const fresh = nextBoard(updated);
    setState({ board: fresh, persisted: saveBoard(fresh) });
    setCelebrating(true);

    if (celebrationTimer.current !== null) {
      window.clearTimeout(celebrationTimer.current);
    }
    celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 6000);
  }

  return (
    <>
      {celebrating ? (
        <Notice tone="success">
          <span className="inline-flex items-center gap-2">
            <PartyPopper size={16} className="shrink-0 text-plum" />
            Całe bingo zaliczone! Wylosowaliśmy dla Ciebie nowe zadania — grajcie
            dalej ❤️
          </span>
        </Notice>
      ) : null}

      {!persisted ? (
        <Notice tone="info">
          Twój postęp nie zapisze się na tym urządzeniu (tryb prywatny lub brak
          miejsca). Plansza wróci do początku po odświeżeniu strony.
        </Notice>
      ) : null}

      {tasks.length < BOARD_SIZE ? (
        <Notice tone="error">
          Część zadań nie została wczytana. Odśwież stronę, żeby zobaczyć pełną
          planszę.
        </Notice>
      ) : null}

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white">
        {tasks.map((task, index) => (
          <BingoTitle
            key={task.id}
            task={task}
            index={index}
            done={done.has(task.id)}
            onSelect={setActiveTask}
          />
        ))}
      </div>

      <BingoModal
        key={activeTask?.id ?? "bingo-modal"}
        task={activeTask}
        done={activeTask ? done.has(activeTask.id) : false}
        onClose={() => setActiveTask(null)}
        onUploaded={completeTask}
      />
    </>
  );
}
