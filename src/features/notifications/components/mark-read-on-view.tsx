"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "../actions";

/** Opening the notifications page marks everything read (after a short delay so unread items are still highlighted). */
export function MarkReadOnView() {
  useEffect(() => {
    const id = setTimeout(() => void markAllNotificationsRead(), 1500);
    return () => clearTimeout(id);
  }, []);
  return null;
}
