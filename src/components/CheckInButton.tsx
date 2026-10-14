import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { Button, useToast } from "./ui";
import { supabase } from "../lib/supabase";
import { fmtTime } from "../lib/format";
import type { Attendance } from "../lib/types";

export function CheckInButton({ today, onDone }: { today: Attendance | null; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isOpen = !!today && !today.check_out;

  const run = async () => {
    setBusy(true);
    const { error } = await supabase.rpc(isOpen ? "check_out" : "check_in");
    setBusy(false);
    if (error) return toast(error.message, "err");
    toast(isOpen ? "Checked out. Good session." : "Checked in. Let's train.");
    onDone();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={run} loading={busy} variant={isOpen ? "ghost" : "primary"} className="min-w-40">
        {isOpen ? <><LogOut className="h-4 w-4" />Check out</> : <><LogIn className="h-4 w-4" />Check in</>}
      </Button>
      {today && <p className="text-sm text-slate-400">In at {fmtTime(today.check_in)}{today.check_out ? `, out at ${fmtTime(today.check_out)}` : ""}</p>}
    </div>
  );
}
