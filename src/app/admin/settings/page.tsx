import Link from "next/link";
import { Check, X, AlertTriangle, ExternalLink, Tags } from "lucide-react";
import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSettings, integrationStatus, devPaymentsWarning } from "@/lib/settings";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const integrations = integrationStatus();
  const devPaymentsOn = devPaymentsWarning();
  const missing = integrations.filter((i) => !i.ready).length;

  return (
    <>
      <Topbar title="Settings" description="How you appear to customers, and what's connected." />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {devPaymentsOn && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-400" />
                <div>
                  <p className="font-semibold text-red-300">Developer payments are on in production</p>
                  <p className="mt-1 text-sm text-red-200/80">
                    Anyone holding a portal link can mark their own project paid. Remove
                    <span className="mx-1 font-mono">ENABLE_DEV_PAYMENTS</span>
                    from your environment variables and redeploy.
                  </p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Your details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-slate-500">
                  Used in the texts and emails that go out to prospects and clients.
                </p>
                <form action={updateSettings} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="ownerName">Your Name</Label>
                      <Input
                        id="ownerName"
                        name="ownerName"
                        defaultValue={settings.ownerName}
                        placeholder="Ryder"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        Signs off your text templates: &ldquo;this is Ryder&rdquo;.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        name="businessName"
                        defaultValue={settings.businessName}
                        placeholder="Webser"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <PhoneInput
                        id="contactPhone"
                        name="contactPhone"
                        defaultValue={settings.contactPhone ?? ""}
                        placeholder="(913) 300-0258"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        defaultValue={settings.contactEmail ?? ""}
                        placeholder="ryder@webser.org"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <SubmitButton />
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-slate-500" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  What you charge lives with your packages, so a change there flows into every new
                  project automatically.
                </p>
                <Link
                  href="/admin/pricing"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300"
                >
                  Manage pricing <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Connections
                  {missing > 0 && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/30">
                      {missing} not set up
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrations.map((i) => (
                  <div key={i.key} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${
                        i.ready ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {i.ready ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${i.ready ? "text-slate-200" : "text-slate-400"}`}>
                        {i.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{i.detail}</p>
                    </div>
                  </div>
                ))}

                <p className="border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-500">
                  These come from environment variables, so they change in your host&apos;s settings
                  rather than here. For the underlying error when something misbehaves, open{" "}
                  <Link href="/api/admin/diagnostics" className="text-brand-400 hover:text-brand-300">
                    diagnostics
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </main>
    </>
  );
}
