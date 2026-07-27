"use client";

import { PartyPopper } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import BingoModal from "@/app/components/bingo/BingoModal";
import BingoTitle from "@/app/components/cards/BingoTitle";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import type { BingoTask } from "@/app/types/bingo";
import {
  BOARD_SIZE,
  boardTasks,
  loadBoard,
  nextBoard,
  saveBoard,
  type BingoBoard,
} from "@/lib/bingoBoard";
import { listBingoPhotos } from "@/lib/photos";
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

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function Board() {
  const { completedAt } = useUploadQueue();
  const [board, setBoard] = useState<BingoBoard>(() => loadBoard());
  const [activeTask, setActiveTask] = useState<BingoTask | null>(null);
  const [serverDone, setServerDone] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const knownPaths = useRef<string[]>([]);

  const done = new Set([...board.doneIds, ...serverDone]);
  const tasks = boardTasks(board);

  const settle = useCallback(
    (current: BingoBoard, doneIds: string[], serverIds: string[]) => {
      const all = new Set([...doneIds, ...serverIds]);

      if (!current.taskIds.every((id) => all.has(id))) {
        if (!sameIds(current.doneIds, doneIds)) {
          const updated = { ...current, doneIds };
          saveBoard(updated);
          setBoard(updated);
        }
        setServerDone((previous) =>
          sameIds(previous, serverIds) ? previous : serverIds,
        );
        return;
      }

      setBoard(nextBoard(current, knownPaths.current));
      setServerDone([]);
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 6000);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    listBingoPhotos(1000)
      .then((photos) => {
        if (!active) return;
        knownPaths.current = photos.map((photo) => photo.path);

        if (
          board.seenPaths.length === 0 &&
          board.doneIds.length === 0 &&
          photos.length > 0
        ) {
          const seeded = { ...board, seenPaths: knownPaths.current };
          saveBoard(seeded);
          setBoard(seeded);
          return;
        }

        const seen = new Set(board.seenPaths);
        const fresh = photos
          .filter((photo) => !seen.has(photo.path))
          .map((photo) => photo.bingoTaskId)
          .filter((id): id is string => id !== null);
        settle(board, board.doneIds, [...new Set(fresh)].sort());
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [completedAt, board, settle]);

  function handleUploaded(task: BingoTask) {
    if (board.doneIds.includes(task.id)) return;
    settle(board, [...board.doneIds, task.id], serverDone);
  }

  return (
    <>
      {celebrating ? (
        <div className="flex items-center gap-2 rounded-lg border border-plum bg-plum/10 px-4 py-3 text-sm text-foreground">
          <PartyPopper size={18} className="shrink-0 text-plum" />
          Całe bingo zaliczone! Wylosowaliśmy nowe zadania — grajcie dalej ❤️
        </div>
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
        onClose={() => setActiveTask(null)}
        onUploaded={handleUploaded}
      />
    </>
  );
}
