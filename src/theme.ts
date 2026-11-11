'use client';
import { createTheme, alpha } from "@mui/material";

export function getTheme(mode: "light" | "dark") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#26b5be" : "#0a7d84",
      },
      secondary: {
        main: isDark ? "#1ea368" : "#007243",
      },
      success: {
        main: isDark ? "#4caf50" : "#2e7d32",
      },
      warning: {
        main: isDark ? "#ffa726" : "#ed6c02",
      },
      error: {
        main: isDark ? "#ef5350" : "#d32f2f",
      },
      background: {
        default: isDark ? "#0f172a" : "#f5f5f5",
        paper: isDark ? "#1e293b" : "#ffffff",
      },
      divider: isDark ? alpha("#ffffff", 0.12) : "#e0e0e0",
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  });
}

const theme = getTheme("light");

export default theme;
