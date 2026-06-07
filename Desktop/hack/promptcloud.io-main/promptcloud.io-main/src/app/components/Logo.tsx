"use client";

import React from "react";

interface LogoProps {
  /** Size variant: auth (68px icon), nav (36px icon), page (48px icon), footer (36px icon) */
  variant: "auth" | "nav" | "page" | "footer";
  /** Show the "PromptCloud" wordmark text */
  showText?: boolean;
  /** Override text size (defaults based on variant) */
  textSize?: number;
  /** Override icon size (defaults based on variant) */
  iconSize?: number;
  /** Light background mode — adjusts border for contrast */
  lightMode?: boolean;
}

const CloudIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

export default function Logo({
  variant,
  showText = true,
  textSize,
  iconSize,
  lightMode = false,
}: LogoProps) {
  // Size configurations
  const configs = {
    auth: {
      boxSize: 68,
      iconSize: 32,
      textSize: 22,
      textWeight: 600,
      layout: "vertical" as const,
      gap: 14,
    },
    nav: {
      boxSize: 36,
      iconSize: 20,
      textSize: 17,
      textWeight: 600,
      layout: "horizontal" as const,
      gap: 10,
    },
    page: {
      boxSize: 48,
      iconSize: 26,
      textSize: 18,
      textWeight: 600,
      layout: "horizontal" as const,
      gap: 12,
    },
    footer: {
      boxSize: 36,
      iconSize: 20,
      textSize: 17,
      textWeight: 600,
      layout: "horizontal" as const,
      gap: 10,
    },
  };

  const cfg = configs[variant];
  const finalIconSize = iconSize ?? cfg.iconSize;
  const finalTextSize = textSize ?? cfg.textSize;

  // Icon box styles — exact spec from login page
  const boxStyle: React.CSSProperties = {
    width: cfg.boxSize,
    height: cfg.boxSize,
    borderRadius: "22px",
    background: "rgba(124, 58, 237, 0.85)",
    border: `1px solid ${lightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(124,58,237,0.25)",
  };

  // Inner top-half glass highlight
  const highlightStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    background: "rgba(255,255,255,0.12)",
    borderRadius: "22px 22px 0 0",
    pointerEvents: "none",
  };

  const textStyle: React.CSSProperties = {
    fontSize: finalTextSize,
    fontWeight: cfg.textWeight,
    color: "#ffffff",
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
  };

  const iconBox = (
    <div style={boxStyle}>
      <div style={highlightStyle} />
      <div style={{ position: "relative", zIndex: 1, color: "#ffffff" }}>
        <CloudIcon size={finalIconSize} />
      </div>
    </div>
  );

  if (!showText) {
    return iconBox;
  }

  if (cfg.layout === "vertical") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: cfg.gap,
        }}
      >
        {iconBox}
        <span style={textStyle}>PromptCloud</span>
      </div>
    );
  }

  // Horizontal layout (nav, page, footer)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: cfg.gap,
      }}
    >
      {iconBox}
      <span style={textStyle}>PromptCloud</span>
    </div>
  );
}
