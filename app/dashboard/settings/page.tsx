"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import { ACCENT_PRESETS, applyAccent, getSavedAccentId } from "../../../lib/theme";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const [selectedAccent, setSelectedAccent] = useState(getSavedAccentId());

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

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
    setDisplayName((user?.user_metadata?.display_name as string) ?? "");
    setLoading(false);
  }

  function handleSelectAccent(id: string) {
    setSelectedAccent(id);
    applyAccent(id);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameError("");
    setNameSaved(false);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    setSavingName(false);

    if (error) {
      setNameError(error.message);
      return;
    }

    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
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
      <h1 className="mb-8 text-2xl font-semibold text-foreground">Settings</h1>

      <div className="flex max-w-lg flex-col gap-6">
        {/* Personal info */}
        <section className="rounded-lg border border-border-color bg-surface p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Personal info
          </h2>
          <p className="mb-4 text-xs text-foreground-muted">
            Signed in as {loading ? "..." : email ?? "Unknown"}
          </p>

          <form onSubmit={handleSaveName}>
            <label className="mb-1 block text-sm text-foreground-muted">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we address you?"
              className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none"
            />

            {nameError && (
              <p className="mb-2 text-xs text-danger">{nameError}</p>
            )}

            <button
              type="submit"
              disabled={savingName}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {nameSaved && <Check size={14} />}
              {savingName ? "Saving..." : nameSaved ? "Saved" : "Save name"}
            </button>
          </form>
        </section>

        {/* Appearance */}
        <section className="rounded-lg border border-border-color bg-surface p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Appearance
          </h2>
          <p className="mb-4 text-xs text-foreground-muted">
            Choose an accent color. Changes apply instantly and are saved on
            this device.
          </p>

          <div className="flex flex-wrap gap-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectAccent(preset.id)}
                title={preset.label}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface"
                  style={{
                    backgroundColor: preset.value,
                    // @ts-expect-error -- CSS custom property for ring color
                    "--tw-ring-color":
                      selectedAccent === preset.id
                        ? preset.value
                        : "transparent",
                  }}
                >
                  {selectedAccent === preset.id && (
                    <Check size={16} color={preset.foreground} />
                  )}
                </span>
                <span className="text-[11px] text-foreground-muted">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Account actions */}
        <section className="rounded-lg border border-border-color bg-surface p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Account
          </h2>
          <p className="mb-4 text-xs text-foreground-muted">
            Log out of DevBoard on this device.
          </p>

          {error && <p className="mb-3 text-sm text-danger">{error}</p>}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger hover:text-white disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </section>
      </div>
    </div>
  );
}