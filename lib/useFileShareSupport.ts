"use client";

import { useSyncExternalStore } from "react";
import { supportsFileShare } from "@/lib/mediaSave";

const subscribe = () => () => undefined;
const serverSnapshot = () => false;

export function useFileShareSupport(): boolean {
  return useSyncExternalStore(subscribe, supportsFileShare, serverSnapshot);
}
