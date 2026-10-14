// Creates a Razorpay order for the signed-in member and a pending payment row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { plan_id } = await req.json();
    const { data: plan } = await userClient.from("plans").select("id,name,price_inr").eq("id", plan_id).eq("active", true).single();
    if (!plan) return json({ error: "Plan not found" }, 404);

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const rz = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${secret}`) },
      body: JSON.stringify({
        amount: Math.round(Number(plan.price_inr) * 100), // paise
        currency: "INR",
        receipt: `vf_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { member_id: user.id, plan_id: plan.id },
      }),
    });
    const order = await rz.json();
    if (!rz.ok) return json({ error: order?.error?.description ?? "Razorpay error" }, 502);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("payments").insert({
      member_id: user.id, plan_id: plan.id, amount_inr: plan.price_inr,
      method: "online", status: "pending", razorpay_order_id: order.id, created_by: user.id,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ order_id: order.id, amount: order.amount, currency: "INR", key_id: keyId, plan_name: plan.name });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
