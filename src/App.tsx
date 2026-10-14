import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Activity, Bell, CalendarCheck, CreditCard, Dumbbell, Home, LayoutDashboard, LineChart, Megaphone, Salad, Settings, ShieldCheck, Tag, User, UserCog, Users, ClipboardCheck } from "lucide-react";
import { NeedsOnboarding, RequireRole } from "./auth/guards";
import { Shell, NavItem } from "./components/Shell";
import { FullSpinner } from "./components/ui";
import { isConfigured } from "./lib/supabase";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";

const Onboarding = lazy(() => import("./pages/member/Onboarding"));
const MDash = lazy(() => import("./pages/member/Dashboard"));
const MAttendance = lazy(() => import("./pages/member/Attendance"));
const MWorkouts = lazy(() => import("./pages/member/Workouts"));
const MDiet = lazy(() => import("./pages/member/Diet"));
const MProgress = lazy(() => import("./pages/member/Progress"));
const MPayments = lazy(() => import("./pages/member/Payments"));
const MNotifications = lazy(() => import("./pages/member/Notifications"));
const MProfile = lazy(() => import("./pages/member/Profile"));

const TDash = lazy(() => import("./pages/trainer/Dashboard"));
const TMembers = lazy(() => import("./pages/trainer/Members"));
const MemberDetail = lazy(() => import("./pages/trainer/MemberDetail"));
const TAttendance = lazy(() => import("./pages/trainer/Attendance"));

const ODash = lazy(() => import("./pages/owner/Dashboard"));
const OMembers = lazy(() => import("./pages/owner/Members"));
const OMemberPage = lazy(() => import("./pages/owner/MemberPage"));
const OPlans = lazy(() => import("./pages/owner/Plans"));
const OPayments = lazy(() => import("./pages/owner/Payments"));
const OAttendance = lazy(() => import("./pages/owner/Attendance"));
const OEnquiries = lazy(() => import("./pages/owner/Enquiries"));
const OStaff = lazy(() => import("./pages/owner/Staff"));
const OAudit = lazy(() => import("./pages/owner/Audit"));
const OSettings = lazy(() => import("./pages/owner/SettingsPage"));

const ic = "h-5 w-5";
const memberNav: NavItem[] = [
  { to: "/member", label: "Home", icon: <Home className={ic} />, end: true },
  { to: "/member/attendance", label: "Attendance", icon: <CalendarCheck className={ic} /> },
  { to: "/member/workouts", label: "Workouts", icon: <Dumbbell className={ic} /> },
  { to: "/member/diet", label: "Diet", icon: <Salad className={ic} /> },
  { to: "/member/progress", label: "Progress", icon: <LineChart className={ic} /> },
  { to: "/member/payments", label: "Payments", icon: <CreditCard className={ic} /> },
  { to: "/member/notifications", label: "Alerts", icon: <Bell className={ic} /> },
  { to: "/member/profile", label: "Profile", icon: <User className={ic} /> },
];
const trainerNav: NavItem[] = [
  { to: "/trainer", label: "Dashboard", icon: <LayoutDashboard className={ic} />, end: true },
  { to: "/trainer/members", label: "My members", icon: <Users className={ic} /> },
  { to: "/trainer/attendance", label: "Verify attendance", icon: <ClipboardCheck className={ic} /> },
];
const ownerNav: NavItem[] = [
  { to: "/owner", label: "Dashboard", icon: <LayoutDashboard className={ic} />, end: true },
  { to: "/owner/members", label: "Members", icon: <Users className={ic} /> },
  { to: "/owner/plans", label: "Plans", icon: <Tag className={ic} /> },
  { to: "/owner/payments", label: "Payments", icon: <CreditCard className={ic} /> },
  { to: "/owner/attendance", label: "Attendance", icon: <Activity className={ic} /> },
  { to: "/owner/enquiries", label: "Enquiries", icon: <Megaphone className={ic} /> },
  { to: "/owner/staff", label: "Staff", icon: <UserCog className={ic} /> },
  { to: "/owner/audit", label: "Audit log", icon: <ShieldCheck className={ic} /> },
  { to: "/owner/settings", label: "Settings", icon: <Settings className={ic} /> },
];

function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-lg">
        <h1 className="text-3xl font-bold uppercase">Setup needed</h1>
        <p className="mt-2 text-slate-300">Supabase keys are missing. Copy <code className="text-lime-300">.env.example</code> to <code className="text-lime-300">.env.local</code>, fill in <code className="text-lime-300">VITE_SUPABASE_URL</code> and <code className="text-lime-300">VITE_SUPABASE_ANON_KEY</code>, then restart <code className="text-lime-300">npm run dev</code>. On Vercel, add the same variables in Project Settings and redeploy.</p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <SetupNotice />;
  return (
    <Suspense fallback={<FullSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/:portal" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage forceSignup />} />

        <Route path="/member/onboarding" element={<RequireRole role="member"><Onboarding /></RequireRole>} />
        <Route path="/member" element={<RequireRole role="member"><NeedsOnboarding><Shell items={memberNav} roleLabel="Member" bottomNav /></NeedsOnboarding></RequireRole>}>
          <Route index element={<MDash />} />
          <Route path="attendance" element={<MAttendance />} />
          <Route path="workouts" element={<MWorkouts />} />
          <Route path="diet" element={<MDiet />} />
          <Route path="progress" element={<MProgress />} />
          <Route path="payments" element={<MPayments />} />
          <Route path="notifications" element={<MNotifications />} />
          <Route path="profile" element={<MProfile />} />
        </Route>

        <Route path="/trainer" element={<RequireRole role="trainer"><Shell items={trainerNav} roleLabel="Trainer" /></RequireRole>}>
          <Route index element={<TDash />} />
          <Route path="members" element={<TMembers />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="attendance" element={<TAttendance />} />
        </Route>

        <Route path="/owner" element={<RequireRole role="owner"><Shell items={ownerNav} roleLabel="Owner" /></RequireRole>}>
          <Route index element={<ODash />} />
          <Route path="members" element={<OMembers />} />
          <Route path="members/:id" element={<OMemberPage />} />
          <Route path="plans" element={<OPlans />} />
          <Route path="payments" element={<OPayments />} />
          <Route path="attendance" element={<OAttendance />} />
          <Route path="enquiries" element={<OEnquiries />} />
          <Route path="staff" element={<OStaff />} />
          <Route path="audit" element={<OAudit />} />
          <Route path="settings" element={<OSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
