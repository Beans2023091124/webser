import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicSite, siteMetadata } from "@/components/site/public-site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const preview = await prisma.preview.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      businessName: true,
      heroSubheadline: true,
      tagline: true,
      isDemo: true,
      status: true,
    },
  });
  if (!preview) return { title: "Not found", robots: { index: false, follow: false } };
  return siteMetadata(preview);
}

export default async function PublicPreviewPage({ params }: { params: { slug: string } }) {
  const preview = await prisma.preview.findUnique({ where: { slug: params.slug } });
  if (!preview) notFound();
  return <PublicSite preview={preview} />;
}
