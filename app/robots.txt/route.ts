export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'}/sitemap.xml`;
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
