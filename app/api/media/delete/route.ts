import { NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSellerByUser, findSellerMedia, getDatabase } from '@/db/queries';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const form = await request.formData();
  const mediaId = Number(form.get('mediaId'));
  const seller = await findSellerByUser(user.userId);
  const media = Number.isInteger(mediaId) ? await findSellerMedia(mediaId) : null;
  if (!seller || !media || media.seller_id !== seller.id) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  await getDatabase().prepare('DELETE FROM seller_media WHERE id = ? AND seller_id = ?').bind(media.id, seller.id).run();
  await env.BUCKET.delete(media.object_key);
  return NextResponse.redirect(new URL('/seller?mediaDeleted=1', request.url), 303);
}
