import { redirect } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { findAccountProfile } from '@/db/queries';

export const dynamic = 'force-dynamic';

export default async function Account() {
  const user = await requireChatGPTUser('/account');
  const account = await findAccountProfile(user.userId);
  redirect(!account ? '/welcome' : account.primary_role === 'seller' ? '/seller' : '/customer');
}
