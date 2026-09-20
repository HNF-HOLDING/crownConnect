"use client";

import { Amplify } from 'aws-amplify';
import { confirmResetPassword, confirmSignUp, fetchAuthSession, resetPassword, signIn, signOut, signUp } from 'aws-amplify/auth';

export const apiUrl = process.env.NEXT_PUBLIC_CROWCONNECT_API_URL ?? 'https://t4rexmr9zk.execute-api.af-south-1.amazonaws.com';
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? 'af-south-1_BtHsQHwj3';
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? '15gofegp1qm23upgot25ck16bv';
const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION ?? 'af-south-1';

// Configure Amplify Auth with the expected shape so helpers like fetchAuthSession work
Amplify.configure({
  Auth: {
    region: awsRegion,
    userPoolId,
    userPoolWebClientId: userPoolClientId,
  },
});

export { confirmResetPassword, confirmSignUp, fetchAuthSession, resetPassword, signIn, signOut, signUp };

export async function cognitoToken() {
  const session = await fetchAuthSession();
  return session?.tokens?.idToken ?? null;
}

export async function awsApi(path: string, init: RequestInit = {}) {
  const token = await cognitoToken();
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  try {
    const res = await fetch(`${apiUrl}${path}`, { ...init, headers });
    return res;
  } catch (err) {
    // Surface a clearer message for client-side errors (network/CORS)
    console.error('awsApi fetch failed', err);
    throw new Error('Network error: failed to contact backend API');
  }
}
