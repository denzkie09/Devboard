"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Check your email
        </h1>
        <p className="max-w-sm text-sm text-foreground-muted">
          We sent a confirmation link to {email}. Click it to activate your account, then log in.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm rounded-lg border border-border-color bg-surface p-6"
      >
        <h1 className="mb-4 text-xl font-semibold text-foreground">
          Create your DevBoard account
        </h1>

        <label className="mb-1 block text-sm text-foreground-muted">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />

        <label className="mb-1 block text-sm text-foreground-muted">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />

        <label className="mb-1 block text-sm text-foreground-muted">
          I am a...
        </label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              role === "student"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border-color bg-background text-foreground-muted hover:text-foreground"
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              role === "teacher"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border-color bg-background text-foreground-muted hover:text-foreground"
            }`}
          >
            Teacher
          </button>
        </div>
        <p className="mb-4 -mt-2 text-xs text-foreground-muted">
          This can't be changed later, so pick the one that matches how
          you'll use DevBoard.
        </p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="mt-4 text-center text-sm text-foreground-muted">
          Already have an account?{" "}
          <a href="/login" className="text-accent underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}