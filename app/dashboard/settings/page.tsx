"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setEmail(user?.email ?? null);
    setLoading(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      setLoggingOut(false);
      return;
    }

    window.location.href = "/login";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Settings</h1>

      <div className="max-w-sm rounded-lg border border-border-color bg-surface p-4">
        <p className="mb-1 text-sm text-foreground-muted">Signed in as</p>
        <p className="mb-4 text-sm font-medium text-foreground">
          {loading ? "Loading..." : email ?? "Unknown"}
        </p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger hover:text-white disabled:opacity-50"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </div>
  );
}