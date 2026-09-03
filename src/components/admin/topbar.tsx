"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export function Topbar({
  title,
  description,
  userName,
  action,
}: {
  title: string;
  description?: string;
  userName?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-900 bg-slate-950/80 py-3 pl-16 pr-4 backdrop-blur sm:py-0 lg:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight text-slate-50">{title}</h1>
        {description && <p className="truncate text-sm text-slate-500">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        {action}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/10 text-xs font-semibold text-brand-400 ring-1 ring-inset ring-brand-600/25">
            {userName ? initials(userName) : "A"}
          </div>
          <span className="hidden text-sm font-medium text-slate-300 sm:inline">{userName ?? "Admin"}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
