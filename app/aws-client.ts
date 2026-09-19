'use client';

import { Amplify } from 'aws-amplify';
import { confirmSignUp, fetchAuthSession, signIn, signOut, signUp } from 'aws-amplify/auth';

export const apiUrl = process.env.NEXT_PUBLIC_CROWCONNECT_API_URL ?? 'https://t4rexmr9zk.execute-api.af-south-1.amazonaws.com';
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? 'af-south-1_BtHsQHwj3';
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? '15gofegp1qm23upgot25ck16bv';

Amplify.configure({
  Auth: { Cognito: { userPoolId, userPoolClientId } },
});

export { confirmSignUp, signIn, signOut, signUp };

export async function cognitoToken() {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? null;
}

export async function awsApi(path: string, init: RequestInit = {}) {
  const token = await cognitoToken();
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${apiUrl}${path}`, { ...init, headers });
}
