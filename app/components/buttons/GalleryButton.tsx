"use client";

import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import Button from "@/app/components/ui/Button";

type GalleryButtonProps = {
  onSelect: (file: File) => void;
  label?: string;
  variant?: "outline" | "solid";
  disabled?: boolean;
};

export default function GalleryButton({
  onSelect,
  label = "Dodaj zdjęcie z galerii lub zrób zdjęcie (lepszej jakości)",
  variant = "outline",
  disabled = false,
}: GalleryButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant={variant}
        icon={<ImagePlus size={35} strokeWidth={1.8} />}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
