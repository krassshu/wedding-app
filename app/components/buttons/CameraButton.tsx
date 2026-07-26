"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import CameraView from "@/app/components/camera/CameraView";
import Button from "@/app/components/ui/Button";

type CameraButtonProps = {
  onSelect: (file: File) => void;
  label?: string;
  variant?: "outline" | "solid";
  disabled?: boolean;
};

export default function CameraButton({
  onSelect,
  label = "Zrób zdjęcie",
  variant = "solid",
  disabled = false,
}: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        icon={<Camera size={20} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {label}
      </Button>

      {open ? (
        <CameraView
          onClose={() => setOpen(false)}
          onCapture={(file) => {
            setOpen(false);
            onSelect(file);
          }}
          onUnavailable={() => {
            setOpen(false);
            inputRef.current?.click();
          }}
        />
      ) : null}

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
