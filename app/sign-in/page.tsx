'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { confirmSignUp, signIn, signUp } from '@/app/aws-client';

export default function SignInPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      if (needsCode) {
        await confirmSignUp({ username: email, confirmationCode: code });
        setNeedsCode(false); setMode('signin'); setMessage('Email confirmed. Sign in to continue.'); return;
      }
      if (mode === 'signup') {
        const result = await signUp({ username: email, password, options: { userAttributes: { email, name } } });
        if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') setNeedsCode(true);
        else setMessage('Account created. You can sign in now.');
      } else {
        await signIn({ username: email, password });
        window.location.assign('/marketplace');
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to continue.'); }
  }

  return <main className="register-page"><Link className="brand" href="/">♛ CrownConnect</Link><div className="register-card"><p className="eyebrow">{needsCode ? 'VERIFY EMAIL' : mode === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p><h1>{needsCode ? 'Check your email' : mode === 'signup' ? 'Join CrownConnect' : 'Sign in'}</h1><form className="registration-form" onSubmit={submit}>{!needsCode && mode === 'signup' && <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>}<label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>{needsCode ? <label>Verification code<input value={code} onChange={(e) => setCode(e.target.value)} required /></label> : <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>}<button className="button" type="submit">{needsCode ? 'Verify email' : mode === 'signup' ? 'Create account' : 'Sign in'}</button></form>{message && <p className="muted">{message}</p>}{!needsCode && <button className="button ghost" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>{mode === 'signin' ? 'Need an account?' : 'Already have an account?'}</button>}</div></main>;
}
