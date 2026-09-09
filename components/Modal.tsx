"use client";

import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onClose} type="button" aria-label="Close" />
      <div className="card relative z-10 w-full max-w-lg p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="serif text-2xl">{title}</h2>
          <button className="btn btn-ghost !min-h-9 !px-3" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
