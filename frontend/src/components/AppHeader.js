import React from "react";

export default function AppHeader({
  title,
  subtitle,
  rightIconSrc, // e.g. "/icons/icon-overlay-white-32.png"
  rightIconAlt = "App icon",
  children, // optional actions row below title bar
}) {
  return (
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

      {children ? <div className="app-header-actions">{children}</div> : null}
    </div>
  );
}