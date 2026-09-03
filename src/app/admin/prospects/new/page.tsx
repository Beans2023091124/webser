import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { createProspect } from "../actions";

export default function NewProspectPage() {
  return (
    <>
      <Topbar title="New prospect" description="Add a local business to your pipeline." />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
        <Card className="mx-auto max-w-3xl">
          <CardContent>
            <ProspectForm action={createProspect} />
          </CardContent>
        </Card>
      </div>
      </main>
    </>
  );
}
