import { prisma } from "@/lib/prisma";
import { readableOn } from "@/lib/color";

/**
 * Per-site favicon as SVG.
 *
 * Deliberately not Next's ImageResponse: @vercel/og rasterises text and needs
 * to load a bundled .ttf, which fails on Windows paths containing spaces and
 * takes the whole page render down with it. An SVG needs no font file at all,
 * renders crisp at every size, and is supported by every current browser.
 */
export const dynamic = "force-dynamic";

function initials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(the|and|of|co|llc|inc)$/i.test(w));

  if (words.length === 0) return (name.trim()[0] ?? "W").toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const preview = await prisma.preview.findUnique({
    where: { slug: params.slug },
    select: { businessName: true, primaryColor: true, faviconUrl: true },
  });

  // An uploaded favicon wins over the generated one.
  if (preview?.faviconUrl) {
    return Response.redirect(new URL(preview.faviconUrl, _req.url), 307);
  }

  const bg = /^#[0-9a-fA-F]{6}$/.test(preview?.primaryColor ?? "") ? preview!.primaryColor : "#1463FF";
  const label = escapeXml(preview ? initials(preview.businessName) : "W");
  const fg = readableOn(bg);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="13" fill="${bg}"/>
  <text x="32" y="33" fill="${fg}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif"
        font-size="${label.length > 1 ? 30 : 40}" font-weight="700" letter-spacing="-1"
        text-anchor="middle" dominant-baseline="central">${label}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
