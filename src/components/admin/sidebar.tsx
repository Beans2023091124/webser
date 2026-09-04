"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Radar,
  MonitorPlay,
  Tags,
  Briefcase,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nav items used to carry a `phase` number that greyed out anything not built
 * yet. Every phase has since shipped, so the branch was unreachable and the
 * "Phase 4" badges were telling the owner their own finished features were
 * still coming.
 */
const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prospects", label: "Prospects", icon: Users },
  { href: "/admin/find", label: "Find leads", icon: Radar },
  { href: "/admin/previews", label: "Previews", icon: MonitorPlay },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/projects", label: "Clients", icon: Briefcase },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Following a link should close the drawer; the route change is the signal.
  useEffect(() => setOpen(false), [pathname]);

  // Never leave the page scroll-locked behind a hidden drawer.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Phone: a button that floats over the page header, and a drawer. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3.5 z-40 rounded-lg border border-slate-800 bg-slate-950/90 p-2 text-slate-300 backdrop-blur transition-colors hover:text-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-900 bg-slate-950 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-2 top-3.5 rounded-md p-2 text-slate-400 hover:text-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Same lockup as the marketing page header. */}
        <div className="flex h-16 flex-none items-center gap-2.5 border-b border-slate-900 px-5">
          {/* 28px local mark — not worth the optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/webser-mark.png" alt="" width={28} height={28} aria-hidden />
          <span className="text-lg font-bold tracking-tight text-slate-50">Webser</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600/10 text-brand-400 ring-1 ring-inset ring-brand-600/25"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                )}
              >
                <Icon className="h-4 w-4 flex-none" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-none border-t border-slate-900 p-4">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="block px-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
          >
            View the public site
          </Link>
        </div>
      </aside>
    </>
  );
}
