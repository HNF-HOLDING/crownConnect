'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  confirmResetPassword,
  confirmSignUp,
  resetPassword,
  signIn,
  signUp,
} from '@/app/aws-client';
import { SiteHeader } from '../site-header';

type Mode = 'signin' | 'signup' | 'reset';
export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('signin'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmPassword, setConfirmPassword] = useState(''),
    [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [step, setStep] = useState<'form' | 'signup-code' | 'reset-code'>('form'),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup')
      setMode('signup');
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setBusy(true);
    try {
      if (step === 'signup-code') {
        await confirmSignUp({ username: email, confirmationCode: code });
        setStep('form');
        setMode('signin');
        setMessage('Email verified. Sign in to complete your profile.');
      } else if (step === 'reset-code') {
        if (password !== confirmPassword)
          throw new Error('The passwords do not match.');
        await confirmResetPassword({
          username: email,
          confirmationCode: code,
          newPassword: password,
        });
        setStep('form');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        setMessage('Password changed. You can sign in now.');
      } else if (mode === 'signup') {
        if (password !== confirmPassword)
          throw new Error('The passwords do not match.');
        const result = await signUp({
          username: email,
          password,
          options: { userAttributes: { email, name } },
        });
        if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          setStep('signup-code');
          setMessage('Enter the verification code sent to your email.');
        }
      } else if (mode === 'reset') {
        await resetPassword({ username: email });
        setStep('reset-code');
        setMessage(
          'Enter the recovery code sent to your email and choose a new password.',
        );
      } else {
        await signIn({ username: email, password });
        const next = new URLSearchParams(window.location.search).get('next');
        window.location.assign(next?.startsWith('/') ? next : '/account');
      }
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : 'Unable to continue.',
      );
    } finally {
      setBusy(false);
    }
  }
  const verification = step !== 'form';
  return (
    <>
      <SiteHeader />
      <main className="register-page">
        <div className="auth-back">
          <Link href="/">← Back to home</Link>
        </div>
        <div className="register-card">
          <p className="eyebrow">
            {step === 'signup-code'
              ? 'VERIFY EMAIL'
              : step === 'reset-code'
                ? 'RESET PASSWORD'
                : mode === 'signup'
                  ? 'CREATE ACCOUNT'
                  : mode === 'reset'
                    ? 'ACCOUNT RECOVERY'
                    : 'WELCOME BACK'}
          </p>
          <h1>
            {verification
              ? 'Check your email'
              : mode === 'signup'
                ? 'Join CrownConnect'
                : mode === 'reset'
                  ? 'Reset your password'
                  : 'Sign in'}
          </h1>
          {mode === 'signup' && !verification && (
            <p>
              Create a secure login first. After email verification, we’ll
              collect only the profile details needed for bookings.
            </p>
          )}
          <form className="registration-form" onSubmit={submit}>
            {!verification && mode === 'signup' && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={verification}
                required
              />
            </label>
            {verification && (
              <label>
                Verification code
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
            )}
            {((!verification && mode !== 'reset') || step === 'reset-code') && (
              <>
                <label>
                  {step === 'reset-code' ? 'New password' : 'Password'}
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    minLength={12}
                    required
                  />
                </label>
                {(mode === 'signup' || step === 'reset-code') && (
                  <>
                    <label>
                      Confirm password
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        autoComplete="new-password"
                        minLength={12}
                        required
                      />
                    </label>
                    <p className="password-help">
                      Use at least 12 characters with uppercase, lowercase, a
                      number, and a symbol.
                    </p>
                  </>
                )}
              </>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? 'Please wait…'
                : step === 'signup-code'
                  ? 'Verify email'
                  : step === 'reset-code'
                    ? 'Save new password'
                    : mode === 'signup'
                      ? 'Create secure login'
                      : mode === 'reset'
                        ? 'Send recovery code'
                        : 'Sign in'}
            </button>
          </form>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          {!verification && (
            <div className="auth-switches">
              <button
                className="text-button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setMessage('');
                }}
              >
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : 'New to CrownConnect? Create account'}
              </button>
              {mode !== 'signup' && (
                <button
                  className="text-button"
                  onClick={() => {
                    setMode(mode === 'reset' ? 'signin' : 'reset');
                    setMessage('');
                  }}
                >
                  {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
