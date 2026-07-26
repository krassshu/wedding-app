import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "outline" | "solid";
  icon?: ReactNode;
  children: ReactNode;
};

const variants: Record<"outline" | "solid", string> = {
  outline:
    "border border-line bg-background text-foreground hover:bg-black/[0.03] active:bg-black/[0.06]",
  solid: "bg-plum text-white hover:bg-plum-dark active:bg-plum-dark",
};

export default function Button({
  variant = "outline",
  icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-4 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
