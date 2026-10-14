import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy } from "lucide-react";
import { Badge, Button, DataTable, Empty, ErrorBox, PageHeader, Spinner, useToast } from "../../components/ui";
import { loadMemberRows } from "../../lib/members";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { daysLeft, fmtDate } from "../../lib/format";
import type { Profile } from "../../lib/types";

export default function Members() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expiring" | "none">("all");
  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, trainers] = await Promise.all([loadMemberRows(), must<Profile[]>(supabase.from("profiles").select("*").eq("role", "trainer"))]);
    return { rows, tn: Object.fromEntries(trainers.map((t) => [t.id, t.full_name || t.email || "Trainer"])) as Record<string, string> };
  }, []);

  const copyLink = async () => { await navigator.clipboard.writeText(`${window.location.origin}/signup`); toast("Sign-up link copied. Share it with new members."); };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const rows = data!.rows.filter((r) => {
    const hit = `${r.p.full_name} ${r.p.phone} ${r.p.email} ${r.m.member_code}`.toLowerCase().includes(q.toLowerCase());
    const d = r.end ? daysLeft(r.end) : null;
    const f = filter === "all" || (filter === "active" && d !== null && d >= 0) || (filter === "expiring" && d !== null && d >= 0 && d <= 7) || (filter === "none" && (d === null || d < 0));
    return hit && f;
  });

  return (
    <>
      <PageHeader title="Members" sub={`${data!.rows.length} registered`} action={<Button variant="ghost" onClick={copyLink}><Copy className="h-4 w-4" />Copy sign-up link</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input max-w-sm" placeholder="Search name, phone, email or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
          <option value="all">All members</option><option value="active">Active plan</option><option value="expiring">Expiring in 7 days</option><option value="none">No active plan</option>
        </select>
      </div>
      {!rows.length ? <Empty title="No members match" sub="New members appear here as soon as they sign up." /> : (
        <DataTable head={["Member", "ID", "Trainer", "Plan ends", "Status", ""]}>
          {rows.map((r) => (
            <tr key={r.m.profile_id}>
              <td className="td"><span className="text-white">{r.p.full_name || "Unnamed"}</span><span className="block text-xs text-slate-500">{r.p.phone ?? r.p.email}</span></td>
              <td className="td">{r.m.member_code}</td><td className="td">{r.m.trainer_id ? data!.tn[r.m.trainer_id] ?? "-" : <span className="text-slate-500">Unassigned</span>}</td>
              <td className="td">{fmtDate(r.end)}</td>
              <td className="td">{!r.p.active ? <Badge tone="red">Disabled</Badge> : r.end && daysLeft(r.end) >= 0 ? <Badge tone={daysLeft(r.end) <= 7 ? "amber" : "green"}>{daysLeft(r.end)}d left</Badge> : <Badge tone="red">No plan</Badge>}</td>
              <td className="td"><Link to={`/owner/members/${r.m.profile_id}`} className="text-lime-400 hover:underline">Manage</Link></td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
