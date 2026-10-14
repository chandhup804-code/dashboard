import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, TextArea, useToast } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate } from "../../lib/format";
import type { DietPlan, Member, ProgressLog, Profile, WorkoutPlan } from "../../lib/types";

const exSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  sets: z.coerce.number().int().min(1, "1-20").max(20, "1-20"),
  reps: z.string().trim().min(1, "Required").max(20),
  rest_sec: z.union([z.literal(""), z.coerce.number().int().min(0).max(600)]).optional(),
});
const workoutSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(80),
  day_label: z.string().trim().min(1, "Enter a day").max(30),
  notes: z.string().max(300).optional(),
  exercises: z.array(exSchema).min(1, "Add at least one exercise"),
});
type WForm = z.infer<typeof workoutSchema>;

const mealSchema = z.object({ name: z.string().trim().min(1, "Required").max(60), time: z.string().trim().min(1, "Required").max(20), items: z.string().trim().min(1, "Required").max(300) });
const dietSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(80),
  calories: z.union([z.literal(""), z.coerce.number().int().min(800).max(6000)]).optional(),
  notes: z.string().max(300).optional(),
  meals: z.array(mealSchema).min(1, "Add at least one meal"),
});
type DForm = z.infer<typeof dietSchema>;

function WorkoutModal({ memberId, open, onClose, onSaved }: { memberId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const uid = useAuth().profile!.id;
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WForm>({
    resolver: zodResolver(workoutSchema),
    defaultValues: { title: "", day_label: "Daily", exercises: [{ name: "", sets: 3, reps: "10", rest_sec: 60 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "exercises" });

  const submit = async (v: WForm) => {
    const exercises = v.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, ...(e.rest_sec === "" || e.rest_sec === undefined ? {} : { rest_sec: e.rest_sec }) }));
    const { error } = await supabase.from("workout_plans").insert({ member_id: memberId, assigned_by: uid, title: v.title, day_label: v.day_label, notes: v.notes || null, exercises });
    if (error) return toast(error.message, "err");
    toast("Workout assigned"); reset(); onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign workout">
      <form onSubmit={handleSubmit(submit)} className="grid gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" placeholder="Push day" error={errors.title?.message} {...register("title")} />
          <Field label="Day" placeholder="Monday" error={errors.day_label?.message} {...register("day_label")} />
        </div>
        <p className="label mb-0">Exercises</p>
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-12 gap-2 rounded-xl bg-ink-900 p-2">
            <input className="input col-span-12" placeholder="Exercise name" aria-label={`Exercise ${i + 1} name`} {...register(`exercises.${i}.name`)} />
            <input className="input col-span-4" placeholder="Sets" inputMode="numeric" aria-label="Sets" {...register(`exercises.${i}.sets`)} />
            <input className="input col-span-4" placeholder="Reps" aria-label="Reps" {...register(`exercises.${i}.reps`)} />
            <input className="input col-span-3" placeholder="Rest s" inputMode="numeric" aria-label="Rest seconds" {...register(`exercises.${i}.rest_sec`)} />
            <button type="button" onClick={() => remove(i)} disabled={fields.length === 1} aria-label="Remove exercise" className="col-span-1 grid place-items-center text-slate-500 hover:text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            {errors.exercises?.[i] && <p className="col-span-12 text-xs text-red-400">Check name, sets (1-20) and reps.</p>}
          </div>
        ))}
        {errors.exercises?.message && <p className="text-xs text-red-400">{errors.exercises.message}</p>}
        <Button type="button" variant="ghost" onClick={() => append({ name: "", sets: 3, reps: "10", rest_sec: 60 })}><Plus className="h-4 w-4" />Add exercise</Button>
        <TextArea label="Notes" {...register("notes")} />
        <Button type="submit" loading={isSubmitting}>Assign workout</Button>
      </form>
    </Modal>
  );
}

function DietModal({ memberId, open, onClose, onSaved }: { memberId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const uid = useAuth().profile!.id;
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DForm>({
    resolver: zodResolver(dietSchema),
    defaultValues: { title: "", meals: [{ name: "Breakfast", time: "8:00 AM", items: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "meals" });

  const submit = async (v: DForm) => {
    const { error } = await supabase.from("diet_plans").insert({
      member_id: memberId, assigned_by: uid, title: v.title, calories: v.calories === "" || v.calories === undefined ? null : v.calories, notes: v.notes || null, meals: v.meals,
    });
    if (error) return toast(error.message, "err");
    toast("Diet plan assigned"); reset(); onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign diet plan">
      <form onSubmit={handleSubmit(submit)} className="grid gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" placeholder="Fat loss plan" error={errors.title?.message} {...register("title")} />
          <Field label="Calories per day" inputMode="numeric" error={errors.calories?.message} {...register("calories")} />
        </div>
        <p className="label mb-0">Meals</p>
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-12 gap-2 rounded-xl bg-ink-900 p-2">
            <input className="input col-span-6" placeholder="Meal" aria-label="Meal name" {...register(`meals.${i}.name`)} />
            <input className="input col-span-5" placeholder="Time" aria-label="Meal time" {...register(`meals.${i}.time`)} />
            <button type="button" onClick={() => remove(i)} disabled={fields.length === 1} aria-label="Remove meal" className="col-span-1 grid place-items-center text-slate-500 hover:text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            <input className="input col-span-12" placeholder="Items, e.g. 3 egg whites, 2 rotis, dal" aria-label="Meal items" {...register(`meals.${i}.items`)} />
            {errors.meals?.[i] && <p className="col-span-12 text-xs text-red-400">Fill in meal, time and items.</p>}
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={() => append({ name: "", time: "", items: "" })}><Plus className="h-4 w-4" />Add meal</Button>
        <TextArea label="Notes" {...register("notes")} />
        <Button type="submit" loading={isSubmitting}>Assign diet plan</Button>
      </form>
    </Modal>
  );
}

/** Shared by trainer and owner. RLS decides what each role can see and change. */
export default function MemberDetail({ memberId: forced }: { memberId?: string }) {
  const params = useParams();
  const id = forced ?? params.id!;
  const { profile: me } = useAuth();
  const toast = useToast();
  const [wOpen, setWOpen] = useState(false);
  const [dOpen, setDOpen] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [p, m, prog, w, d] = await Promise.all([
      must<Profile>(supabase.from("profiles").select("*").eq("id", id).single()),
      must<Member>(supabase.from("members").select("*").eq("profile_id", id).single()),
      must<ProgressLog[]>(supabase.from("progress_logs").select("*").eq("member_id", id).order("logged_on")),
      must<WorkoutPlan[]>(supabase.from("workout_plans").select("*").eq("member_id", id).order("created_at", { ascending: false })),
      must<DietPlan[]>(supabase.from("diet_plans").select("*").eq("member_id", id).order("created_at", { ascending: false })),
    ]);
    return { p, m, prog, w, d };
  }, [id]);

  const del = async (table: "workout_plans" | "diet_plans", rid: string) => {
    if (!confirm("Remove this plan?")) return;
    const { error: e } = await supabase.from(table).delete().eq("id", rid);
    if (e) toast(e.message, "err"); else reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { p, m, prog, w, d } = data!;
  const back = me?.role === "owner" ? "/owner/members" : "/trainer/members";
  const chart = prog.filter((r) => r.weight_kg).map((r) => ({ date: fmtDate(r.logged_on), weight: Number(r.weight_kg) }));

  return (
    <>
      {!forced && <Link to={back} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Members</Link>}
      <PageHeader title={p.full_name || "Unnamed member"} sub={[m.member_code, p.phone, p.email].filter(Boolean).join("  |  ")} />
      <Card className="mb-4 grid gap-3 text-sm sm:grid-cols-4">
        <div><p className="text-slate-400">Goal</p><p className="text-white">{m.goal ?? "-"}</p></div>
        <div><p className="text-slate-400">Height</p><p className="text-white">{m.height_cm ? `${m.height_cm} cm` : "-"}</p></div>
        <div><p className="text-slate-400">Date of birth</p><p className="text-white">{fmtDate(m.dob)}</p></div>
        <div><p className="text-slate-400">Joined</p><p className="text-white">{fmtDate(m.join_date)}</p></div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-2xl font-bold uppercase">Progress</h2>
        {chart.length < 2 ? <Empty title="Not enough entries yet" sub="The member logs weight from their Progress tab." /> : (
          <div className="h-56"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}><CartesianGrid stroke="#22304F" strokeDasharray="3 3" /><XAxis dataKey="date" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip contentStyle={{ background: "#0F182C", border: "1px solid #22304F", borderRadius: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="#C6FF2E" strokeWidth={3} dot={{ r: 3, fill: "#C6FF2E" }} /></LineChart>
          </ResponsiveContainer></div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-bold uppercase">Workouts</h2><Button onClick={() => setWOpen(true)}><Plus className="h-4 w-4" />Assign</Button></div>
          {!w.length ? <Empty title="No workouts assigned" /> : w.map((x) => (
            <div key={x.id} className="mb-3 rounded-xl bg-ink-900 p-3 text-sm">
              <div className="flex justify-between"><p className="font-medium text-white">{x.title} <span className="text-slate-400">({x.day_label})</span></p>
                <button onClick={() => del("workout_plans", x.id)} aria-label="Remove workout" className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>
              <p className="mt-1 text-slate-400">{x.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`).join(", ")}</p>
            </div>
          ))}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-bold uppercase">Diet plans</h2><Button onClick={() => setDOpen(true)}><Plus className="h-4 w-4" />Assign</Button></div>
          {!d.length ? <Empty title="No diet plan assigned" /> : d.map((x) => (
            <div key={x.id} className="mb-3 rounded-xl bg-ink-900 p-3 text-sm">
              <div className="flex justify-between"><p className="font-medium text-white">{x.title}{x.calories ? <span className="text-slate-400"> ({x.calories} kcal)</span> : null}</p>
                <button onClick={() => del("diet_plans", x.id)} aria-label="Remove diet plan" className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>
              <p className="mt-1 text-slate-400">{x.meals.map((e) => e.name).join(", ")}</p>
            </div>
          ))}
        </Card>
      </div>
      <WorkoutModal memberId={id} open={wOpen} onClose={() => setWOpen(false)} onSaved={reload} />
      <DietModal memberId={id} open={dOpen} onClose={() => setDOpen(false)} onSaved={reload} />
    </>
  );
}
