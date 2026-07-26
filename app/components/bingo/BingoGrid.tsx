"use client";

import { useEffect, useState } from "react";
import BingoModal from "@/app/components/bingo/BingoModal";
import BingoTitle from "@/app/components/cards/BingoTitle";
import bingoData from "@/app/data/bingo.json";
import type { BingoData, BingoTask } from "@/app/types/bingo";
import { listBingoPhotos } from "@/lib/photos";

const { tasks } = bingoData as BingoData;

export default function BingoGrid() {
  const [activeTask, setActiveTask] = useState<BingoTask | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    listBingoPhotos(1000)
      .then((photos) => {
        if (!active) return;
        setDoneIds(
          photos
            .map((photo) => photo.bingoTaskId)
            .filter((id): id is string => id !== null),
        );
      })
      .catch(() => {
        if (active) setDoneIds([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white">
        {tasks.map((task, index) => (
          <BingoTitle
            key={task.id}
            task={task}
            index={index}
            done={doneIds.includes(task.id)}
            onSelect={setActiveTask}
          />
        ))}
      </div>

      <BingoModal
        key={activeTask?.id ?? "bingo-modal"}
        task={activeTask}
        onClose={() => setActiveTask(null)}
        onUploaded={(task) =>
          setDoneIds((ids) => (ids.includes(task.id) ? ids : [...ids, task.id]))
        }
      />
    </>
  );
}
