import { describe, expect, it } from "vitest";
import { partitionArchiveFiles, type ArchiveFile } from "@/lib/archiveParts";

const file = (path: string, size: number): ArchiveFile => ({
  path,
  size,
  createdAt: "2026-08-30T20:00:00.000Z",
});

describe("partitionArchiveFiles", () => {
  it("dzieli pliki bez przekraczania limitu części", () => {
    const parts = partitionArchiveFiles(
      [file("gallery/a.jpg", 6), file("gallery/b.jpg", 5), file("gallery/c.jpg", 4)],
      10,
    );

    expect(parts.map((part) => part.bytes)).toEqual([6, 9]);
    expect(parts.flatMap((part) => part.files.map((item) => item.path))).toEqual([
      "gallery/a.jpg",
      "gallery/b.jpg",
      "gallery/c.jpg",
    ]);
  });

  it("zostawia pojedynczy plik większy od limitu jako osobną część", () => {
    const parts = partitionArchiveFiles(
      [file("gallery/large.mov", 12), file("gallery/photo.jpg", 2)],
      10,
    );

    expect(parts.map((part) => part.bytes)).toEqual([12, 2]);
  });

  it("zwraca pustą listę dla pustej galerii lub błędnego limitu", () => {
    expect(partitionArchiveFiles([])).toEqual([]);
    expect(partitionArchiveFiles([file("gallery/a.jpg", 1)], 0)).toEqual([]);
  });
});
