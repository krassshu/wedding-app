import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  TUS_CHUNK_BYTES,
  extensionForMedia,
  isValidUploadDescriptor,
  normalizedMediaType,
} from "./uploadPolicy";

describe("uploadPolicy", () => {
  it("normalizuje popularne typy z telefonu", () => {
    expect(normalizedMediaType({ name: "IMG_1.JPG", type: "image/jpeg" })).toBe(
      "image/jpeg",
    );
    expect(normalizedMediaType({ name: "film.MOV", type: "" })).toBe(
      "video/quicktime",
    );
    expect(extensionForMedia({ name: "film.MOV", type: "video/quicktime" })).toBe(
      "mov",
    );
  });

  it("odrzuca typy spoza listy", () => {
    expect(normalizedMediaType({ name: "dokument.pdf", type: "application/pdf" })).toBeNull();
    expect(normalizedMediaType({ name: "payload.exe", type: "" })).toBeNull();
  });

  it("utrzymuje fragment TUS wyraźnie poniżej limitu Cloudflare", () => {
    expect(TUS_CHUNK_BYTES).toBe(6 * 1024 * 1024);
    expect(MAX_UPLOAD_BYTES).toBe(90 * 1024 * 1024);
    expect(TUS_CHUNK_BYTES).toBeLessThan(7 * 1024 * 1024);
  });

  it("akceptuje wyłącznie bezpieczną ścieżkę, rozmiar i zgodne rozszerzenie", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(
      isValidUploadDescriptor(`gallery/${uuid}.jpg`, 5_000_000, "image/jpeg"),
    ).toBe(true);
    expect(
      isValidUploadDescriptor(
        `gallery/bingo__pierwszy-taniec__${uuid}.mp4`,
        MAX_UPLOAD_BYTES,
        "video/mp4",
      ),
    ).toBe(true);
    expect(isValidUploadDescriptor(`gallery/${uuid}.jpg`, 1, "video/mp4")).toBe(false);
    expect(isValidUploadDescriptor("gallery/../../atak.jpg", 1, "image/jpeg")).toBe(false);
    expect(
      isValidUploadDescriptor(`gallery/${uuid}.jpg`, MAX_UPLOAD_BYTES + 1, "image/jpeg"),
    ).toBe(false);
  });
});
