import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TusOptions = {
  onProgress?: (sent: number, total: number) => void;
  onSuccess?: () => void;
  uploadDataDuringCreation?: boolean;
};

const tusState = vi.hoisted(() => ({
  abort: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  options: null as TusOptions | null,
}));

vi.mock("tus-js-client", () => ({
  DetailedError: class DetailedError extends Error {},
  Upload: class Upload {
    private readonly file: Blob;
    private readonly options: TusOptions;

    constructor(file: Blob, options: TusOptions) {
      this.file = file;
      this.options = options;
      tusState.options = options;
    }

    findPreviousUploads() {
      return Promise.resolve([]);
    }

    resumeFromPreviousUpload() {}

    start() {
      // Odtwarzamy błąd z Safari: 100% jest zgłoszone, ale onSuccess nigdy nie przychodzi.
      this.options.onProgress?.(this.file.size, this.file.size);
    }

    abort() {
      return tusState.abort();
    }
  },
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabaseAnonKey: "public-test-key",
  supabaseUrl: "https://photos.example.test",
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://photos.example.test/${path}` },
        }),
      }),
    },
  },
}));

import { uploadPhoto } from "./photos";

describe("uploadPhoto", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tusState.abort.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("kończy upload po serwerowym potwierdzeniu, gdy TUS zatrzyma się na 100%", async () => {
    const authorize = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "upload-token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ alreadyUploaded: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", authorize);

    const progress = vi.fn();
    const file = new File([new Uint8Array([1, 2, 3])], "zdjecie.jpg", {
      type: "image/jpeg",
    });
    const pending = uploadPhoto(
      "gallery/123e4567-e89b-12d3-a456-426614174000.jpg",
      file,
      progress,
    );

    await vi.advanceTimersByTimeAsync(1_100);

    await expect(pending).resolves.toMatchObject({
      path: "gallery/123e4567-e89b-12d3-a456-426614174000.jpg",
    });
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith(1);
    expect(tusState.abort).toHaveBeenCalledOnce();
    expect(tusState.options?.uploadDataDuringCreation).toBe(false);
  });
});
