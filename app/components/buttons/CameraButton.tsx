"use client";

import { Camera } from "lucide-react";
import { useRef } from "react";
import Button from "@/app/components/ui/Button";

type CameraButtonProps = {
  onSelect: (file: File) => void;
  label?: string;
  variant?: "outline" | "solid";
  disabled?: boolean;
};

export default function CameraButton({
  onSelect,
  label = "Zrób szybkie zdjęcie",
  variant = "solid",
  disabled = false,
}: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant={variant}
        icon={<Camera size={20} strokeWidth={1.8} />}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {label}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
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
