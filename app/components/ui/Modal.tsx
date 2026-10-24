"use client";

import React, { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: "sm" | "md" | "lg";
    /** Klik na pozadinu zatvara prozor (podrazumevano da) */
    dismissable?: boolean;
    className?: string;
}

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/** Pristupačan modal: Esc zatvara, fokus ulazi u prozor i vraća se nazad, pozadina se ne skroluje. */
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = "md",
    dismissable = true,
    className,
}: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descId = useId();
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        panelRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && dismissable) {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab" || !panelRef.current) return;
            const focusable = panelRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [open, dismissable]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9000] flex items-end justify-center p-0 sm:items-center sm:p-6">
            <div
                className="absolute inset-0 animate-fade bg-ink/55 backdrop-blur-sm"
                onClick={dismissable ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={cn(
                    "relative flex max-h-[92dvh] w-full animate-fade-up flex-col overflow-hidden bg-surface shadow-pop outline-none",
                    "rounded-t-[1.75rem] sm:rounded-[1.75rem]",
                    SIZES[size],
                    className
                )}
            >
                {(title || dismissable) && (
                    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7 sm:py-5">
                        <div className="min-w-0">
                            {title && (
                                <h2 id={titleId} className="text-xl font-extrabold text-ink sm:text-2xl">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id={descId} className="mt-0.5 text-sm font-medium text-ink-soft">
                                    {description}
                                </p>
                            )}
                        </div>
                        {dismissable && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Zatvori"
                                className="-mr-1.5 -mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-brand-50 hover:text-ink"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="scroll-soft flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
                {footer && (
                    <div className="flex flex-col-reverse gap-3 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
