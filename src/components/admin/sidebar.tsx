"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  MonitorPlay,
  Tags,
  Briefcase,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { href: "/admin/prospects", label: "Prospects", icon: Users, phase: 1 },
  { href: "/admin/previews", label: "Previews", icon: MonitorPlay, phase: 2 },
  { href: "/admin/templates", label: "Templates", icon: Layers, phase: 2 },
  { href: "/admin/pricing", label: "Pricing", icon: Tags, phase: 2 },
  { href: "/admin/projects", label: "Clients", icon: Briefcase, phase: 3 },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, phase: 4 },
  { href: "/admin/settings", label: "Settings", icon: Settings, phase: 4 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-black">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800/80 px-5">
        <img src="/webser-mark.png" alt="Webser" width={28} height={28} className="rounded-sm" />
        <span className="text-lg font-bold tracking-tight">
          <span className="text-slate-50">Web</span>
          <span className="text-brand-500">ser</span>
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const isAvailable = item.phase <= 3;
          const Icon = item.icon;

          const content = (
            <>
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className="flex-1">{item.label}</span>
              {!isAvailable && (
                <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  Phase {item.phase}
                </span>
              )}
            </>
          );

          if (!isAvailable) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600"
                title={`Coming in Phase ${item.phase}`}
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 p-4">
        <p className="px-1 text-[11px] leading-relaxed text-slate-600">
          Find Business → Preview → Sell → Build → Deploy → Handoff
        </p>
      </div>
    </aside>
  );
}
