import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, DataTable, Empty, ErrorBox, PageHeader, Spinner } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { loadMemberRows } from "../../lib/members";
import { useAsync } from "../../lib/useAsync";
import { daysLeft, fmtDate } from "../../lib/format";

export default function Members() {
  const uid = useAuth().profile!.id;
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useAsync(() => loadMemberRows(uid), [uid]);
  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const rows = (data ?? []).filter((r) => `${r.p.full_name} ${r.p.phone} ${r.p.email} ${r.m.member_code}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="My members" sub={`${data?.length ?? 0} assigned to you`} />
      <input className="input mb-4 max-w-sm" placeholder="Search name, phone or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
      {!rows.length ? <Empty title="No members found" sub="The owner assigns members to trainers." /> : (
        <DataTable head={["Member", "ID", "Goal", "Plan ends", ""]}>
          {rows.map((r) => (
            <tr key={r.m.profile_id}>
              <td className="td"><span className="text-white">{r.p.full_name || "Unnamed"}</span><span className="block text-xs text-slate-500">{r.p.phone ?? r.p.email}</span></td>
              <td className="td">{r.m.member_code}</td><td className="td max-w-[200px] truncate">{r.m.goal ?? "-"}</td>
              <td className="td">{r.end ? <Badge tone={daysLeft(r.end) <= 7 ? "amber" : "green"}>{fmtDate(r.end)}</Badge> : <Badge tone="red">No plan</Badge>}</td>
              <td className="td"><Link to={`/trainer/members/${r.m.profile_id}`} className="text-lime-400 hover:underline">Open</Link></td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
