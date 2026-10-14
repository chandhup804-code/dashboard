const TZ = "Asia/Kolkata";

export const inr = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  const date = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00+05:30") : new Date(d);
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export const fmtTime = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d)) : "-";

export const fmtDateTime = (d: string | Date | null | undefined) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : "-");

export const daysLeft = (end: string) => {
  const ms = new Date(end + "T00:00:00+05:30").getTime() - new Date(todayIST() + "T00:00:00+05:30").getTime();
  return Math.round(ms / 86400000);
};

export const shiftDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00+05:30");
  d.setDate(d.getDate() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
};

export const toPhone = (digits: string) => "+91" + digits.replace(/\D/g, "").slice(-10);

export function downloadCSV(name: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
