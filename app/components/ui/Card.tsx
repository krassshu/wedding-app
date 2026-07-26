import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-line bg-background ${className}`}
    >
      {children}
    </div>
  );
}
