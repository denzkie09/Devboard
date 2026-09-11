export type AccentPreset = {
  id: string;
  label: string;
  value: string; // hex used for --accent
  foreground: string; // hex used for --accent-foreground (text on top of the accent)
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "amber", label: "Amber", value: "#f2b705", foreground: "#12141a" },
  { id: "teal", label: "Teal", value: "#2dd4bf", foreground: "#0b1413" },
  { id: "violet", label: "Violet", value: "#a78bfa", foreground: "#171225" },
  { id: "rose", label: "Rose", value: "#fb7185", foreground: "#1a0e10" },
  { id: "sky", label: "Sky", value: "#38bdf8", foreground: "#0b1620" },
];

const STORAGE_KEY = "devboard-accent";

export function getSavedAccentId(): string {
  if (typeof window === "undefined") return ACCENT_PRESETS[0].id;
  return window.localStorage.getItem(STORAGE_KEY) ?? ACCENT_PRESETS[0].id;
}

export function applyAccent(id: string) {
  const preset = ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
  document.documentElement.style.setProperty("--accent", preset.value);
  document.documentElement.style.setProperty(
    "--accent-foreground",
    preset.foreground
  );
  window.localStorage.setItem(STORAGE_KEY, preset.id);
}