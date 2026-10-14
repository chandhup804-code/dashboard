// Drains message_queue: email via Resend, WhatsApp via Meta Cloud API.
// Call on a schedule (cron-job.org / GitHub Actions) with header:  x-cron-secret: <CRON_SECRET>
// Deploy: supabase functions deploy process-queue --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await admin.rpc("run_daily_automation");

  const { data: jobs } = await admin.from("message_queue").select("*").eq("status", "pending").order("created_at").limit(50);
  let sent = 0, failed = 0;

  for (const j of jobs ?? []) {
    try {
      if (j.channel === "email") {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to: [j.recipient], subject: j.subject ?? "VivekFitness", text: j.body }),
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        const to = String(j.recipient).replace(/\D/g, "");
        const r = await fetch(`https://graph.facebook.com/v20.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
          // Outside the 24h window WhatsApp needs an approved template. Create a template named
          // "membership_reminder" with one body variable and get it approved in Meta Business Manager.
          body: JSON.stringify({
            messaging_product: "whatsapp", to, type: "template",
            template: { name: "membership_reminder", language: { code: "en" },
              components: [{ type: "body", parameters: [{ type: "text", text: j.body }] }] },
          }),
        });
        if (!r.ok) throw new Error(await r.text());
      }
      await admin.from("message_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", j.id);
      sent++;
    } catch (e) {
      await admin.from("message_queue").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", j.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
});
