"use client";

import { useEffect } from "react";
import { markNotificationRead } from "../actions";

/** Marks the opened notification read (the action refreshes the bell counter). */
export function MarkRead({ id }: { id: string }) {
  useEffect(() => {
    void markNotificationRead(id);
  }, [id]);
  return null;
}
