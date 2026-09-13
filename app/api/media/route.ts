import { NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { findSellerByUser, getDatabase } from '@/db/queries';

const allowed = new Map([['image/jpeg', 'image'], ['image/png', 'image'], ['image/webp', 'image'], ['video/mp4', 'video'], ['video/webm', 'video']]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const seller = await findSellerByUser(user.userId);
  const form = await request.formData();
  const file = form.get('media');
  if (!seller || !(file instanceof File)) return NextResponse.json({ error: 'Create your seller profile before uploading work.' }, { status: 400 });
  const mediaType = allowed.get(file.type);
  const limit = mediaType === 'video' ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!mediaType || !file.size || file.size > limit) return NextResponse.json({ error: 'Choose a JPG, PNG, WebP, MP4, or WebM file within the upload size limit.' }, { status: 400 });
  const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
  const objectKey = `seller/${seller.id}/${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { sellerId: String(seller.id) } });
  try {
    await getDatabase().prepare('INSERT INTO seller_media (seller_id, object_key, media_type, content_type, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(seller.id, objectKey, mediaType, file.type, file.name.slice(0, 140), Date.now()).run();
  } catch (error) {
    await env.BUCKET.delete(objectKey);
    throw error;
  }
  return NextResponse.redirect(new URL('/seller?media=1', request.url), 303);
}
