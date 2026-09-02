import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { TemplateCard } from "@/components/templates/template-card";
import { INDUSTRY_DEFAULTS } from "@/lib/preview";
import { updateTemplate } from "./actions";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { previews: true } } },
  });

  const missing = Object.keys(INDUSTRY_DEFAULTS).filter(
    (industry) => !templates.some((t) => t.industry === industry)
  );
  if (missing.length > 0) {
    for (const industry of missing) {
      const defaults = INDUSTRY_DEFAULTS[industry];
      await prisma.template.upsert({
        where: { slug: industry },
        update: {},
        create: {
          slug: industry,
          name: `${defaults.label} Template`,
          industry,
          description: `Starting point for ${defaults.label.toLowerCase()} businesses.`,
          sections: {},
        },
      });
    }
  }

  const allTemplates = missing.length > 0
    ? await prisma.template.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { previews: true } } },
      })
    : templates;

  return (
    <>
      <Topbar
        title="Templates"
        description="Industry starting points used when generating a website preview."
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {allTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              previewCount={template._count.previews}
              updateAction={updateTemplate.bind(null, template.id)}
            />
          ))}
        </div>
      </main>
    </>
  );
}
