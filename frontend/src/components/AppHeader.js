// src/components/AppHeader.js
import React, { useMemo } from "react";

/**
 * AppHeader
 * - Sticky header bar (title + optional subtitle + optional right icon)
 * - Optional "actions" row under the bar (pass via `actions`)
 * - Wraps your existing page content via `children`
 *
 * ✅ GH Pages safe icon handling:
 * - If you pass "/icons/xyz.png" it will automatically become:
 *   `${process.env.PUBLIC_URL}/icons/xyz.png`
 * - If you pass "icons/xyz.png" it will also be prefixed.
 * - If you pass an absolute URL ("https://...", "data:...", "blob:...") it is left alone.
 */
export default function AppHeader({
  title,
  subtitle,
  rightIconSrc, // e.g. "/icons/icon-overlay-white-32-v1.png"
  rightIconAlt = "App icon",

  actions, // JSX for buttons/filters under the header
  children, // your existing page content
}) {
  const resolvedRightIconSrc = useMemo(() => {
    const src = (rightIconSrc || "").trim();
    if (!src) return "";

    // Leave absolute / special URLs alone
    const lower = src.toLowerCase();
    const isAbsolute =
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.startsWith("data:") ||
      lower.startsWith("blob:");

    if (isAbsolute) return src;

    // If already includes the PUBLIC_URL prefix, keep it
    const base = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
    if (base && src.startsWith(base + "/")) return src;

    // Normalize: allow "/icons/.." or "icons/.."
    const path = src.startsWith("/") ? src : `/${src}`;

    // Prefix for GH Pages / subpaths
    return base ? `${base}${path}` : path;
  }, [rightIconSrc]);

  return (
    <div className="app-page">
      <div className="app-header-wrap">
        <div className="app-header-bar">
          <div className="app-header-spacer" />

          <div className="app-header-center">
            <div className="app-header-title">{title}</div>
            {subtitle ? (
              <div className="app-header-subtitle">{subtitle}</div>
            ) : null}
          </div>

          <div className="app-header-right">
            {resolvedRightIconSrc ? (
              <img
                src={resolvedRightIconSrc}
                alt={rightIconAlt}
                className="app-header-icon"
                draggable={false}
                onError={(e) => {
                  // Fail gracefully if missing
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
        </div>

        {actions ? <div className="app-header-actions">{actions}</div> : null}
      </div>

      <div className="page-content-with-header">{children}</div>
    </div>
  );
}