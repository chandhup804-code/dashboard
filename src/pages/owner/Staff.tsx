import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge, Button, Card, DataTable, Empty, ErrorBox, Field, PageHeader, SelectField, Spinner, useToast } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import type { Profile } from "../../lib/types";

const schema = z.object({ email: z.string().trim().email("Enter the email they signed up with"), role: z.enum(["trainer", "owner"]) });
type Form = z.infer<typeof schema>;

export default function Staff() {
  const me = useAuth().profile!;
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => must<Profile[]>(supabase.from("profiles").select("*").in("role", ["trainer", "owner"]).order("created_at")), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { role: "trainer" } });

  const promote = async (v: Form) => {
    const { error: e } = await supabase.rpc("set_user_role", { target_email: v.email, new_role: v.role });
    if (e) return toast(e.message, "err");
    toast(`Access updated: ${v.role}`); reset({ role: "trainer" } as Form); reload();
  };
  const demote = async (p: Profile) => {
    if (!confirm(`Move ${p.full_name || p.email} back to a regular member?`)) return;
    const { error: e } = await supabase.rpc("set_user_role", { target_email: p.email, new_role: "member" });
    if (e) toast(e.message, "err"); else { toast("Access removed"); reload(); }
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Staff" sub="Trainers and owners." />
      <Card className="mb-6 max-w-2xl">
        <h2 className="mb-1 text-2xl font-bold uppercase">Give staff access</h2>
        <p className="mb-3 text-sm text-slate-400">Ask the person to create an account from the Sign up page with their email, then enter that email here.</p>
        <form onSubmit={handleSubmit(promote)} className="grid gap-3 sm:grid-cols-3" noValidate>
          <Field className="sm:col-span-2" label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <SelectField label="Role" {...register("role")}><option value="trainer">Trainer</option><option value="owner">Owner</option></SelectField>
          <Button className="sm:col-span-3" type="submit" loading={isSubmitting}>Update access</Button>
        </form>
      </Card>
      {!data?.length ? <Empty title="No staff yet" /> : (
        <DataTable head={["Name", "Contact", "Role", ""]}>
          {data.map((p) => (
            <tr key={p.id}><td className="td text-white">{p.full_name || "Unnamed"}</td><td className="td">{p.email ?? p.phone}</td>
              <td className="td"><Badge tone={p.role === "owner" ? "green" : "blue"}>{p.role}</Badge></td>
              <td className="td">{p.id !== me.id && p.email && <button onClick={() => demote(p)} className="text-red-300 hover:underline">Remove access</button>}</td></tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
