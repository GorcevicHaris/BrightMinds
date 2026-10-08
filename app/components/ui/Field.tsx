import React, { useId } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
    "w-full min-h-12 rounded-xl border bg-white px-4 text-ink font-semibold placeholder:text-ink-faint placeholder:font-medium " +
    "transition-[border-color,box-shadow] duration-150 outline-none " +
    "focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60 disabled:bg-canvas";

interface FieldShellProps {
    id: string;
    label?: string;
    hint?: string;
    error?: string;
    optional?: boolean;
    children: React.ReactNode;
}

function FieldShell({ id, label, hint, error, optional, children }: FieldShellProps) {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-bold text-ink-soft">
                    <span>{label}</span>
                    {optional && <span className="text-xs font-semibold text-ink-faint">opciono</span>}
                </label>
            )}
            {children}
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-semibold text-rose-600">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-faint">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

interface CommonProps {
    label?: string;
    hint?: string;
    error?: string;
    optional?: boolean;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, CommonProps {
    /** Ikonica levo u polju */
    icon?: React.ReactNode;
    /** Sadržaj desno u polju (npr. dugme "prikaži lozinku") */
    trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, hint, error, optional, icon, trailing, className, id, ...props }, ref) => {
        const autoId = useId();
        const fieldId = id ?? autoId;
        return (
            <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional}>
                <div className="relative">
                    {icon && (
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">{icon}</span>
                    )}
                    <input
                        ref={ref}
                        id={fieldId}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
                        className={cn(
                            CONTROL,
                            error ? "border-rose-400" : "border-line",
                            icon ? "pl-12" : undefined,
                            trailing ? "pr-12" : undefined,
                            className
                        )}
                        {...props}
                    />
                    {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
                </div>
            </FieldShell>
        );
    }
);
Input.displayName = "Input";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, CommonProps {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, hint, error, optional, className, id, children, ...props }, ref) => {
        const autoId = useId();
        const fieldId = id ?? autoId;
        return (
            <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional}>
                <div className="relative">
                    <select
                        ref={ref}
                        id={fieldId}
                        aria-invalid={error ? true : undefined}
                        className={cn(CONTROL, "appearance-none pr-10", error ? "border-rose-400" : "border-line", className)}
                        {...props}
                    >
                        {children}
                    </select>
                    <svg
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden="true"
                    >
                        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </FieldShell>
        );
    }
);
Select.displayName = "Select";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, CommonProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, hint, error, optional, className, id, ...props }, ref) => {
        const autoId = useId();
        const fieldId = id ?? autoId;
        return (
            <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional}>
                <textarea
                    ref={ref}
                    id={fieldId}
                    aria-invalid={error ? true : undefined}
                    className={cn(CONTROL, "resize-none py-3", error ? "border-rose-400" : "border-line", className)}
                    {...props}
                />
            </FieldShell>
        );
    }
);
Textarea.displayName = "Textarea";
