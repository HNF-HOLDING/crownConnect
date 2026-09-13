import { env } from 'cloudflare:workers';
import { findSellerMedia } from '@/db/queries';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await findSellerMedia(Number(id));
  if (!media) return new Response('Not found', { status: 404 });
  const object = await env.BUCKET.get(media.object_key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { headers: { 'content-type': media.content_type, 'cache-control': 'public, max-age=31536000, immutable', 'content-disposition': `inline; filename="${media.file_name.replace(/["\\]/g, '')}"` } });
}
