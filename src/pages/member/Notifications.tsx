import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Button, Empty, ErrorBox, PageHeader, Spinner } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDateTime } from "../../lib/format";
import type { Notification } from "../../lib/types";

export default function Notifications() {
  const uid = useAuth().profile!.id;
  const { data, loading, error, reload } = useAsync(
    () => must<Notification[]>(supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100)), [uid]);

  useEffect(() => {
    const ch = supabase.channel(`notif-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, reload]);

  const markRead = async (id?: string) => {
    const q = supabase.from("notifications").update({ read: true }).eq("user_id", uid);
    await (id ? q.eq("id", id) : q.eq("read", false));
    reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <>
      <PageHeader title="Alerts" sub="Reminders, receipts and updates." action={unread > 0 ? <Button variant="ghost" onClick={() => markRead()}>Mark all read</Button> : undefined} />
      {!data?.length ? <Empty title="Nothing here yet" /> : (
        <ul className="grid gap-3">
          {data.map((n) => (
            <li key={n.id}>
              <button onClick={() => !n.read && markRead(n.id)} className={`card flex w-full gap-3 text-left ${n.read ? "opacity-70" : "border-lime-400/40"}`}>
                <Bell className={`mt-0.5 h-5 w-5 shrink-0 ${n.read ? "text-slate-500" : "text-lime-400"}`} />
                <div><p className="font-medium text-white">{n.title}</p>{n.body && <p className="text-sm text-slate-400">{n.body}</p>}<p className="mt-1 text-xs text-slate-500">{fmtDateTime(n.created_at)}</p></div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
