"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/** Opens the browser's print dialog — "Save as PDF" there gives the certificate as a file. */
export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "h-11")}>
      <Printer className="size-4" /> {children}
    </button>
  );
}
