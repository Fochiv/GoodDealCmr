import { useTheme } from "next-themes";

export function useColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return {
    isDark: dark,
    bg:          dark ? "#0d0d0d"                     : "#ffffff",
    bgSecondary: dark ? "#111111"                     : "#f5f5f5",
    bgCard:      dark ? "#1a1a1a"                     : "#f0f0f0",
    bgCardAlt:   dark ? "#222222"                     : "#e8e8e8",
    bgModal:     dark ? "#1a1a1a"                     : "#ffffff",
    text:        dark ? "#ffffff"                     : "#111111",
    textMuted:   dark ? "#9ca3af"                     : "#6b7280",
    textSubtle:  dark ? "#6b7280"                     : "#9ca3af",
    border:      dark ? "rgba(255,255,255,0.08)"      : "rgba(0,0,0,0.08)",
    borderMd:    dark ? "rgba(255,255,255,0.15)"      : "rgba(0,0,0,0.15)",
    heroGrad:    dark
      ? "linear-gradient(180deg, #1a0800 0%, #0d0d0d 100%)"
      : "linear-gradient(180deg, #fff3e0 0%, #ffffff 100%)",
    heroGradMtn: dark
      ? "linear-gradient(180deg, #1a1500 0%, #0d0d0d 100%)"
      : "linear-gradient(180deg, #fffde7 0%, #ffffff 100%)",
    heroGradOrange: dark
      ? "linear-gradient(180deg, #1a0800 0%, #0d0d0d 100%)"
      : "linear-gradient(180deg, #fff3e0 0%, #ffffff 100%)",
    hoverBg:     dark ? "rgba(255,255,255,0.06)"      : "rgba(0,0,0,0.04)",
    skeleton:    dark ? "#2a2a2a"                     : "#e5e5e5",
  };
}
