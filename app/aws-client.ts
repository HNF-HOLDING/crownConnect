'use client';

import { Amplify } from 'aws-amplify';

export const apiUrl =
  process.env.NEXT_PUBLIC_CROWCONNECT_API_URL ??
  'https://t4rexmr9zk.execute-api.af-south-1.amazonaws.com';
const userPoolId =
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? 'af-south-1_BtHsQHwj3';
const userPoolClientId =
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ??
  '15gofegp1qm23upgot25ck16bv';
const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION ?? 'af-south-1';

// Configure Amplify Auth with the expected shape so helpers like fetchAuthSession work
const authConfig: any = {
  Cognito: {
    userPoolId,
    userPoolClientId: userPoolClientId,
  },
  region: awsRegion,
};
// Provide minimal `loginWith` defaults to avoid undefined access in the library
authConfig.Cognito.loginWith = authConfig.Cognito.loginWith ?? {
  username: true,
  email: false,
  phone: false,
};
Amplify.configure({ Auth: authConfig });

// Dynamically load auth helpers after Amplify is configured to avoid
// the auth package executing configuration-time code on static import.
export async function confirmResetPassword(input: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.confirmResetPassword(input);
}
export async function confirmSignUp(input: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.confirmSignUp(input);
}
export async function fetchAuthSession(options?: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.fetchAuthSession(options);
}
export async function resetPassword(input: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.resetPassword(input);
}
export async function signIn(input: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.signIn(input);
}
export async function signOut(input?: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.signOut(input);
}
export async function signUp(input: any) {
  const mod = await import('@aws-amplify/auth');
  return mod.signUp(input);
}

export async function cognitoToken() {
  const session = await fetchAuthSession();
  return session?.tokens?.idToken ?? null;
}

export async function cognitoGroups() {
  const token = await cognitoToken();
  const groups = token?.payload?.['cognito:groups'];
  return Array.isArray(groups) ? groups.map(String) : [];
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
