'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { projectPath, projectRefOf } from '@/utils/paths';
import { useAuthConfig } from '@/services/authConfig.service';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  isExistingAccountError,
  registerAndAccept,
  signInForInvite,
  signInWithOidcForInvite,
} from '../services/invite.service';

type Mode = 'register' | 'signin';

// Authentication step for the invitee. The email is fixed to the invited address
// (the API only lets that email accept), so it is shown read-only. A new invitee
// registers and joins in one step, opening the project. An existing invitee only
// signs in — the page then shows the accept/reject step so they can decide.
export default function InviteAuthForm({
  token,
  email,
  hasAccount,
}: {
  token: string;
  email: string;
  hasAccount: boolean;
}) {
  const t = useTranslations('invite');
  const tLogin = useTranslations('auth.login');
  const authConfig = useAuthConfig();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(hasAccount ? 'signin' : 'register');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  // A neutral note (not an error) — e.g. when we switch a registration to sign-in
  // because the invited email already has an account.
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRegister = mode === 'register';
  const passwordEnabled = authConfig?.emailPassword !== false;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('error')) setError(t('signInFailed'));
  }, [t]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setConfirm('');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (isRegister && password !== confirm) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setPending(true);
    try {
      if (isRegister) {
        const result = await registerAndAccept({
          email,
          password,
          token,
          registerFailed: t('registerFailed'),
        });
        router.push(
          result.projectKey ? projectPath(projectRefOf(result.teamRef, result.projectKey)) : '/',
        );
        router.refresh();
      } else {
        await signInForInvite({ email, password, signInFailed: t('signInFailed') });
        router.refresh();
      }
    } catch (err) {
      // There is no upfront "email exists" check, so a taken email surfaces only
      // here — switch to sign-in and keep the password the invitee already typed.
      if (isRegister && isExistingAccountError(err)) {
        switchMode('signin');
        setNotice(t('existingAccountNotice'));
      } else {
        setError(err instanceof Error ? err.message : t('genericError'));
      }
      setPending(false);
    }
  }

  async function onOidc() {
    setError(null);
    setPending(true);
    try {
      await signInWithOidcForInvite(token);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('signInFailed'));
      setPending(false);
    }
  }

  let submitLabel;
  if (isRegister) {
    submitLabel = pending ? t('registering') : t('register');
  } else {
    submitLabel = pending ? t('signingIn') : t('signIn');
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="invite-email">{t('emailLabel')}</FieldLabel>
          <Input id="invite-email" type="email" value={email} readOnly disabled />
          <FieldDescription>{t('emailHint')}</FieldDescription>
        </Field>

        {passwordEnabled && (
          <Field>
            <FieldLabel htmlFor="invite-password">{t('passwordLabel')}</FieldLabel>
            <Input
              id="invite-password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
            {isRegister && <FieldDescription>{t('passwordHint')}</FieldDescription>}
          </Field>
        )}

        {passwordEnabled && isRegister && (
          <Field>
            <FieldLabel htmlFor="invite-confirm">{t('confirmPasswordLabel')}</FieldLabel>
            <Input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={pending}
            />
          </Field>
        )}

        {notice && <FieldDescription className="text-foreground">{notice}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}

        {passwordEnabled && (
          <Field>
            <Button type="submit" disabled={pending}>
              {submitLabel}
            </Button>
          </Field>
        )}

        {authConfig?.oidc && (
          <>
            {passwordEnabled && <FieldSeparator>{tLogin('or')}</FieldSeparator>}
            <Field>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void onOidc()}
              >
                <ShieldCheck />
                {authConfig.oidcLabel || tLogin('withSso')}
              </Button>
            </Field>
          </>
        )}

        {passwordEnabled && (
          <FieldDescription className="text-center">
            {isRegister ? t('haveAccount') : t('needAccount')}{' '}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => switchMode(isRegister ? 'signin' : 'register')}
              disabled={pending}
            >
              {isRegister ? t('switchToSignIn') : t('switchToRegister')}
            </button>
          </FieldDescription>
        )}
      </FieldGroup>
    </form>
  );
}
