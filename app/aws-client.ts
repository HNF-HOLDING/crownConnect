"use client";

import Amplify, { Auth } from 'aws-amplify';

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

// Export simple wrappers around Amplify Auth so UI code can call the same helpers
export async function signIn(username: string, password: string) { return Auth.signIn(username, password); }
export async function signOut() { return Auth.signOut(); }
export async function signUp(options: any) { return Auth.signUp(options); }
export async function confirmSignUp(username: string, code: string) { return Auth.confirmSignUp(username, code); }
export async function resetPassword(username: string) { return Auth.forgotPassword(username); }
export async function confirmResetPassword(username: string, code: string, newPassword: string) { return Auth.forgotPasswordSubmit(username, code, newPassword); }

export async function fetchAuthSession() {
  try {
    const session = await Auth.currentSession();
    return {
      tokens: {
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      },
    };
  } catch (e) {
    return null;
  }
}

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
