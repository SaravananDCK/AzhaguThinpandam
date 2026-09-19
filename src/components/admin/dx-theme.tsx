"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const LINK_ID = "dx-theme";

export function dxStylesheetHref(dark: boolean): string {
  return dark ? "/dx/dx.dark.css" : "/dx/dx.light.css";
}

/**
 * Keeps DevExtreme's stylesheet in step with the admin's light/dark theme.
 * The admin layout inserts the initial <link> before first paint (an inline
 * script that reads next-themes' stored choice), so this only has to react to
 * toggles. It swaps the href and the colour-scheme class DevExtreme puts on
 * <body> for typography.
 */
export function DxTheme() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const dark = resolvedTheme === "dark";
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    const href = dxStylesheetHref(dark);
    if (!link.getAttribute("href")?.endsWith(href)) link.href = href;
    document.body.classList.toggle("dx-color-scheme-dark", dark);
    document.body.classList.toggle("dx-color-scheme-light", !dark);
  }, [resolvedTheme]);

  return null;
}

/**
 * Inline script for the admin layout: picks the stylesheet before React runs
 * so the grids never flash the wrong theme. Mirrors next-themes' resolution —
 * the stored "theme" key, falling back to the OS preference.
 */
export const DX_THEME_BOOT_SCRIPT = `
(function () {
  try {
    if (document.getElementById(${JSON.stringify(LINK_ID)})) return;
    var t = localStorage.getItem("theme");
    var dark = t === "dark" || ((!t || t === "system") && matchMedia("(prefers-color-scheme: dark)").matches);
    var l = document.createElement("link");
    l.id = ${JSON.stringify(LINK_ID)};
    l.rel = "stylesheet";
    l.href = dark ? ${JSON.stringify(dxStylesheetHref(true))} : ${JSON.stringify(dxStylesheetHref(false))};
    document.head.appendChild(l);
  } catch (e) {}
})();
`.trim();
