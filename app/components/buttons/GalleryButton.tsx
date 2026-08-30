"use client";

import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import Button from "@/app/components/ui/Button";

type GalleryButtonProps = {
  onSelect: (files: File[]) => void;
  label?: string;
  variant?: "outline" | "solid";
  disabled?: boolean;
};

export default function GalleryButton({
  onSelect,
  label = "Dodaj zdjęcie z galerii",
  variant = "outline",
  disabled = false,
}: GalleryButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant={variant}
        icon={<ImagePlus size={20} strokeWidth={1.8} />}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onSelect(files);
          event.target.value = "";
        }}
      />
    </>
  );
}
