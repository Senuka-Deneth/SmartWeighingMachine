"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signup, initialState);

  return (
    <div className="page-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-palette-primary hover:text-palette-primary-hover"
          >
            Smart Stock Monitor
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign up to access the maintenance dashboard
          </p>
        </div>

        <div className="card p-8">
          {state.success ? (
            <div className="space-y-4 text-center">
              <p className="banner-success px-4 py-3 text-sm text-palette-success">
                {state.success}
              </p>
              <Link href="/login" className="btn-primary w-full">
                Go to sign in
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input-field"
                  placeholder="you@store.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-muted"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="input-field"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-muted"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="input-field"
                />
              </div>

              {state.error && (
                <p className="banner-warning px-4 py-3 text-sm text-palette-warning">
                  {state.error}
                </p>
              )}

              <SubmitButton />
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-palette-primary hover:text-palette-primary-hover"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
