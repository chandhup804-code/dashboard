// Razorpay webhook: verifies HMAC signature, then activates the membership (idempotent).
// Configure in Razorpay Dashboard > Webhooks, event: payment.captured (and order.paid).
// Deploy WITHOUT JWT verification:  supabase functions deploy razorpay-webhook --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacHex(Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!, body);
  if (sig.length !== expected.length || sig !== expected) return new Response("bad signature", { status: 400 });

  const evt = JSON.parse(body);
  if (evt.event !== "payment.captured" && evt.event !== "order.paid") return new Response("ignored", { status: 200 });

  const pay = evt.payload?.payment?.entity;
  if (!pay?.order_id) return new Response("no order", { status: 200 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.rpc("complete_online_payment", { p_order: pay.order_id, p_rzp_payment: pay.id });
  if (error) return new Response(error.message, { status: 500 }); // Razorpay will retry
  return new Response("ok", { status: 200 });
});
