import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/admin/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex flex-col items-center text-center">
          {/* Fixed-size local logo on a page nobody reaches twice — next/image
              would add a request and a layout wrapper for no gain. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/webser-full.png"
            alt="Webser — Websites that work"
            width={300}
            height={200}
            className="-mb-2"
          />
          <p className="mt-2 text-sm text-slate-500">
            Your web-design business, run from one dashboard.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/40">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
