"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getTheme } from "@/theme";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeModeContextType {
  preference: ThemePreference;
  resolvedMode: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
}

const STORAGE_KEY = "ll_theme_mode";

const ThemeModeContext = createContext<ThemeModeContextType>({
  preference: "system",
  resolvedMode: "light",
  setPreference: () => {},
});

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState<boolean>(false);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (salvo === "light" || salvo === "dark" || salvo === "system") {
      setPreferenceState(salvo);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setPreference = (novaPref: ThemePreference) => {
    setPreferenceState(novaPref);
    localStorage.setItem(STORAGE_KEY, novaPref);
  };

  const resolvedMode: "light" | "dark" =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedMode);
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

  const contextValue = useMemo(
    () => ({ preference, resolvedMode, setPreference }),
    [preference, resolvedMode]
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeModeContext);
