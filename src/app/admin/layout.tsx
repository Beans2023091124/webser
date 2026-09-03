import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { AuthSessionProvider } from "@/components/session-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Scoped to /admin rather than the root layout. A client's website is a
  // public page that never reads a session, and mounting the provider globally
  // shipped next-auth's client runtime to every visitor and had each of them
  // fetch /api/auth/session before the page settled.
  return (
    <AuthSessionProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </AuthSessionProvider>
  );
}
