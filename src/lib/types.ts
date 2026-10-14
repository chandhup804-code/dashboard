export type Role = "member" | "trainer" | "owner";
export interface Profile { id: string; role: Role; full_name: string; email: string | null; phone: string | null; avatar_url?: string | null; active: boolean; created_at: string }
export interface Member { profile_id: string; trainer_id: string | null; member_code: string | null; dob: string | null; gender: string | null; height_cm: number | null; goal: string | null; emergency_contact: string | null; join_date: string }
export interface Plan { id: string; name: string; duration_days: number; price_inr: number; description: string | null; active: boolean }
export interface Membership { id: string; member_id: string; plan_id: string; start_date: string; end_date: string; status: "active" | "expired" | "cancelled"; plans?: { name: string } | null }
export interface Payment { id: string; member_id: string; plan_id: string | null; amount_inr: number; method: string; status: "pending" | "paid" | "failed" | "refunded"; invoice_no: string | null; paid_at: string | null; created_at: string; notes: string | null; plans?: { name: string } | null }
export interface Attendance { id: string; member_id: string; day: string; check_in: string; check_out: string | null; verified_by: string | null; verified_at: string | null }
export interface Exercise { name: string; sets: number; reps: string; rest_sec?: number; notes?: string }
export interface WorkoutPlan { id: string; member_id: string; title: string; day_label: string; exercises: Exercise[]; notes: string | null; active: boolean; created_at: string }
export interface Meal { name: string; time: string; items: string }
export interface DietPlan { id: string; member_id: string; title: string; calories: number | null; meals: Meal[]; notes: string | null; active: boolean; created_at: string }
export interface ProgressLog { id: string; member_id: string; logged_on: string; weight_kg: number | null; body_fat_pct: number | null; chest_cm: number | null; waist_cm: number | null; notes: string | null }
export interface Notification { id: string; user_id: string; title: string; body: string | null; kind: string; read: boolean; created_at: string }
export interface Enquiry { id: string; name: string; phone: string; email: string | null; interest: string | null; source: string | null; status: "new" | "contacted" | "trial" | "converted" | "lost"; notes: string | null; created_at: string }
export interface GymSettings { id: number; gym_name: string; address: string | null; phone: string | null; email: string | null; gstin: string | null; reminder_days: number }
