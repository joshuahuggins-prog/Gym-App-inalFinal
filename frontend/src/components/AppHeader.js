import React from "react";

/**
 * AppHeader
 * - Sticky header bar (title + optional subtitle + optional right icon)
 * - Optional "actions" row under the bar (pass via `actions`)
 * - Wraps your existing page content via `children`
 */
export default function AppHeader({
  title,
  subtitle,
  rightIconSrc, // e.g. "/icons/icon-overlay-white-32.png"
  rightIconAlt = "App icon",

  actions,      // JSX for buttons/filters under the header
  children,     // your existing page content
}) {
  return (
    <div className="app-page">
      <div className="app-header-wrap">
        <div className="app-header-bar">
          <div className="app-header-spacer" />
          <div className="app-header-center">
            <div className="app-header-title">{title}</div>
            {subtitle ? <div className="app-header-subtitle">{subtitle}</div> : null}
          </div>

          <div className="app-header-right">
            {rightIconSrc ? (
              <img
                src={rightIconSrc}
                alt={rightIconAlt}
                className="app-header-icon"
                draggable={false}
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