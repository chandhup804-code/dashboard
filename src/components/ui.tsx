import { ButtonHTMLAttributes, createContext, forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useCallback, useContext, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-lime-400 ${className}`} aria-label="Loading" />;
}
export function FullSpinner() {
  return <div className="grid min-h-dvh place-items-center"><Spinner className="h-8 w-8" /></div>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger"; loading?: boolean };
export function Button({ variant = "primary", loading, className = "", children, disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold uppercase sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: string }) {
  return (
    <div className="card flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold text-white">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">{icon}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  green: "bg-lime-400/15 text-lime-300", red: "bg-red-500/15 text-red-300",
  amber: "bg-amber-400/15 text-amber-300", slate: "bg-slate-500/20 text-slate-300", blue: "bg-sky-400/15 text-sky-300",
};
export function Badge({ tone = "slate", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-600 p-8 text-center">
      <p className="font-medium text-white">{title}</p>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && <button className="underline" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/* Form controls — all forward refs so they work with react-hook-form's register() */
type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };
export const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, error, hint, id, className = "", ...rest }, ref) => {
  const fid = id ?? `f-${label.replace(/\W/g, "").toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">{label}</label>
      <input id={fid} ref={ref} className="input" aria-invalid={!!error} {...rest} />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string };
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, children, id, className = "", ...rest }, ref) => {
  const fid = id ?? `s-${label.replace(/\W/g, "").toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">{label}</label>
      <select id={fid} ref={ref} className="input" {...rest}>{children}</select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
});

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };
export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(({ label, error, id, className = "", ...rest }, ref) => {
  const fid = id ?? `t-${label.replace(/\W/g, "").toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">{label}</label>
      <textarea id={fid} ref={ref} rows={3} className="input" {...rest} />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
});

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-ink-600 bg-ink-800 p-5 sm:max-w-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold uppercase">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-700"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Toasts */
interface ToastItem { id: number; msg: string; kind: "ok" | "err" }
const ToastCtx = createContext<(msg: string, kind?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, msg, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg ${t.kind === "ok" ? "border-lime-400/40 bg-ink-800 text-lime-200" : "border-red-500/40 bg-ink-800 text-red-200"}`}>
            {t.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-600/60">
      <table className="w-full min-w-[640px] divide-y divide-ink-600/60">
        <thead className="bg-ink-900/60"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-ink-600/40 bg-ink-800">{children}</tbody>
      </table>
    </div>
  );
}
