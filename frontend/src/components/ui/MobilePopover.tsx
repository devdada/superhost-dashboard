"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Desktop: classes for absolutely positioned panel (parent must be `relative`). */
  desktopPanelClassName: string;
};

/**
 * On viewports below `sm`, renders a centered sheet in a portal so popovers
 * are not clipped by overflow or pushed off-screen. Desktop uses inline absolute positioning.
 */
export function MobilePopover({ open, onClose, children, desktopPanelClassName }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const mobileSheet =
    mounted &&
    createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[200] bg-black/50 sm:hidden"
          onClick={onClose}
          aria-label="Close"
        />
        <div
          className="fixed left-3 right-3 top-[max(4.5rem,12vh)] z-[201] max-h-[min(75vh,32rem)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </>,
      document.body,
    );

  return (
    <>
      {mobileSheet}
      <div className={`${desktopPanelClassName} hidden sm:block`}>{children}</div>
    </>
  );
}
