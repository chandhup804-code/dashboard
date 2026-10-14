import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, MoreHorizontal } from "lucide-react";
import { Logo } from "./Brand";
import { useAuth } from "../auth/AuthProvider";

export interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

export function Shell({ items, roleLabel, bottomNav = false }: { items: NavItem[]; roleLabel: string; bottomNav?: boolean }) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const logout = async () => { await signOut(); navigate("/", { replace: true }); };
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-lime-400 text-ink-950" : "text-slate-300 hover:bg-ink-700"}`;

  const NavList = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={link} onClick={onNav}>{i.icon}{i.label}</NavLink>
      ))}
    </nav>
  );

  const UserBox = () => (
    <div className="mt-auto border-t border-ink-600/60 pt-4">
      <p className="truncate text-sm font-medium text-white">{profile?.full_name || profile?.email || profile?.phone}</p>
      <p className="mb-3 text-xs text-slate-400">{roleLabel}</p>
      <button onClick={logout} className="btn btn-ghost w-full"><LogOut className="h-4 w-4" />Sign out</button>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-ink-600/60 bg-ink-900 p-4 lg:flex">
        <Logo />
        <NavList />
        <UserBox />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-ink-600/60 bg-ink-900/95 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <Logo size="sm" />
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-300 hover:bg-ink-700"><Menu className="h-6 w-6" /></button>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-28 sm:p-6 lg:pb-10"><Outlet /></main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col gap-6 bg-ink-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Logo size="sm" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-300 hover:bg-ink-700"><X className="h-5 w-5" /></button>
            </div>
            <NavList onNav={() => setOpen(false)} />
            <UserBox />
          </div>
        </div>
      )}

      {bottomNav && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-600/60 bg-ink-900/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Quick">
          {items.slice(0, 4).map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}
              className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? "text-lime-400" : "text-slate-400"}`}>
              {i.icon}{i.label}
            </NavLink>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-400">
            <MoreHorizontal className="h-5 w-5" />More
          </button>
        </nav>
      )}
    </div>
  );
}
