import { must, supabase } from "./supabase";
import type { Member, Profile } from "./types";

export interface MemberRow { m: Member; p: Profile; end: string | null }

/** Loads members (optionally only one trainer's) with profile and latest membership end date. */
export async function loadMemberRows(trainerId?: string): Promise<MemberRow[]> {
  let mq = supabase.from("members").select("*").limit(1000);
  if (trainerId) mq = mq.eq("trainer_id", trainerId);
  const members = await must<Member[]>(mq);
  if (!members.length) return [];
  const ids = members.map((m) => m.profile_id);

  let pq = supabase.from("profiles").select("*").eq("role", "member").limit(1000);
  let sq = supabase.from("memberships").select("member_id,end_date").eq("status", "active").order("end_date", { ascending: false }).limit(1000);
  if (trainerId) { pq = pq.in("id", ids); sq = sq.in("member_id", ids); }
  const [profiles, ships] = await Promise.all([must<Profile[]>(pq), must<{ member_id: string; end_date: string }[]>(sq)]);

  const pm = new Map(profiles.map((p) => [p.id, p]));
  const end = new Map<string, string>();
  ships.forEach((s) => { if (!end.has(s.member_id)) end.set(s.member_id, s.end_date); });
  return members.filter((m) => pm.has(m.profile_id)).map((m) => ({ m, p: pm.get(m.profile_id)!, end: end.get(m.profile_id) ?? null }));
}
