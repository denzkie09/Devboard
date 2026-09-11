"use client";

import { useEffect } from "react";
import { applyAccent, getSavedAccentId } from "../../lib/theme";

export default function ThemeInitializer() {
  useEffect(() => {
    applyAccent(getSavedAccentId());
  }, []);

  return null;
}