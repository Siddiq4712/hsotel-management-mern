const colors = require('./src/theme/colors');

// Preserve existing class names while giving every screen the shared palette.
const family = (base, soft, tint, dark = base) => ({
  50: soft, 100: tint, 200: tint, 300: tint, 400: base,
  500: base, 600: base, 700: base, 800: dark, 900: dark, 950: dark,
});
const primary = family(colors.primary, colors.primarySoft, colors.primaryTint, colors.primaryDark);
const neutral = {
  50: colors.background, 100: colors.surface, 200: colors.border,
  300: colors.borderStrong, 400: colors.mutedText, 500: colors.mutedText,
  600: colors.mutedText, 700: colors.text, 800: colors.text,
  900: colors.text, 950: colors.text,
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: colors.primary, dark: colors.primaryDark, soft: colors.primarySoft },
        background: colors.background,
        card: colors.card,
        content: colors.text,
        muted: colors.mutedText,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        accent: colors.accent,
        white: colors.card,
        gray: neutral,
        slate: neutral,
        blue: primary,
        indigo: primary,
        purple: primary,
        violet: primary,
        fuchsia: primary,
        pink: family(colors.accent, colors.accentSoft, colors.accentTint),
        lime: family(colors.success, colors.successSoft, colors.successTint),
        green: family(colors.success, colors.successSoft, colors.successTint),
        emerald: family(colors.success, colors.successSoft, colors.successTint),
        yellow: family(colors.warning, colors.warningSoft, colors.warningTint),
        amber: family(colors.warning, colors.warningSoft, colors.warningTint),
        orange: family(colors.warning, colors.warningSoft, colors.warningTint),
        red: family(colors.danger, colors.dangerSoft, colors.dangerTint),
        rose: family(colors.danger, colors.dangerSoft, colors.dangerTint),
        teal: family(colors.accent, colors.accentSoft, colors.accentTint),
        cyan: family(colors.accent, colors.accentSoft, colors.accentTint),
      },
    },
  },
  plugins: [],
};
