/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ✅ Better-feeling motion defaults (used by `animate-*` utilities)
      transitionTimingFunction: {
        // Snappy but not harsh
        "ui-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        // Smooth in-out for toggles / layout changes
        "ui-inout": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        // Handy consistent durations
        250: "250ms",
        350: "350ms",
        450: "450ms",
      },

      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        // ✅ More “premium” fades (less linear, less floaty)
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-12px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },

        // ✅ Better slide (uses subtle scale so it feels responsive)
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px) scale(0.985)" },
          to: { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px) scale(0.985)" },
          to: { opacity: "1", transform: "translateX(0) scale(1)" },
        },

        // ✅ Small pop for chips/toasts/buttons
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },

        // ✅ Confetti stays (just keeps your existing)
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(100vh) rotate(360deg)",
            opacity: "0",
          },
        },
      },

      animation: {
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",

        // ✅ New, nicer defaults
        "fade-up": "fade-up 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-down": "fade-down 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 220ms cubic-bezier(0.16, 1, 0.3, 1)",

        confetti: "confetti 3s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};