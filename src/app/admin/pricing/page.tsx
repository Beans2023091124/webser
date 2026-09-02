import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { PackageCard } from "@/components/pricing/package-card";
import { NewPackageForm } from "@/components/pricing/new-package-form";
import { createPackage, updatePackage, deletePackage } from "./actions";

export default async function PricingPage() {
  const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <>
      <Topbar title="Pricing" description="Configure the packages you sell to prospects." />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              updateAction={updatePackage.bind(null, pkg.id)}
              deleteAction={deletePackage.bind(null, pkg.id)}
            />
          ))}
          <NewPackageForm action={createPackage} />
        </div>
      </main>
    </>
  );
}
