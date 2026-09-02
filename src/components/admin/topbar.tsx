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
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        {action}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-400">
            {userName ? initials(userName) : "A"}
          </div>
          <span className="text-sm font-medium text-slate-300">{userName ?? "Admin"}</span>
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
