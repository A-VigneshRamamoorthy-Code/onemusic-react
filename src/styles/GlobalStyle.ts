import { createGlobalStyle } from 'styled-components';

/**
 * Design-system tokens (light + dark), base reset, page background, focus ring and
 * the reduced-motion guard. Component-specific styling lives in each component's
 * `*.style.ts`; everything here is intentionally global.
 */
export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light dark;
    --neutral-primary-soft: #ffffff;
    --neutral-primary: #ffffff;
    --neutral-primary-medium: #ffffff;
    --neutral-primary-strong: #ffffff;
    --neutral-secondary-soft: #fafbfc;
    --neutral-secondary: #fafbfc;
    --neutral-secondary-medium: #f2f2f5;
    --neutral-secondary-strong: #f2f2f5;
    --neutral-tertiary-soft: #ededf0;
    --neutral-tertiary: #ededf0;
    --neutral-tertiary-medium: #ededf0;
    --neutral-quaternary: #dfdfe3;
    --quaternary-medium: #dfdfe3;
    --gray: #c8c8d0;
    --brand-softer: #fff1f3;
    --brand-soft: #ffe1e6;
    --brand: #fa2d48;
    --brand-medium: #fbb6c2;
    --brand-strong: #e11d48;
    --success-soft: #ecfdf5;
    --success: #059669;
    --success-medium: #d1fae5;
    --success-strong: #047857;
    --danger-soft: #fef2f2;
    --danger: #dc2626;
    --danger-medium: #fee2e2;
    --danger-strong: #b91c1c;
    --warning-soft: #fffbeb;
    --warning: #d97706;
    --warning-medium: #fef3c7;
    --warning-strong: #b45309;
    --dark: #131316;
    --dark-strong: #0d0d12;
    --disabled: #f2f2f5;
    --white: #ffffff;
    --black: #131316;
    --heading: #131316;
    --body: #5e5f6e;
    --body-subtle: #747686;
    --fg-brand-subtle: #fbb6c2;
    --fg-brand: #fa2d48;
    --fg-brand-strong: #c81e3a;
    --border-default: #e8e8ec;
    --border-default-medium: #e8e8ec;
    --border-default-strong: #e8e8ec;
    --border-brand: #fa2d48;
    --border-brand-subtle: #fbb6c2;
    --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
    --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07);
    --radius-base: 12px;
    --radius-default: 8px;
    --radius-full: 9999px;
    --color-1-400: rgb(255 255 255 / 0.15);
    --color-1-700: rgb(0 0 0 / 0.08);
    --ease: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-out: cubic-bezier(0.05, 0.7, 0.1, 1);
    --dur-quick: 160ms;
    --dur: 300ms;
    --dur-slow: 460ms;
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08);
    --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.18);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --neutral-primary-soft: #111116;
      --neutral-primary: #0d0d12;
      --neutral-primary-medium: #1a1a21;
      --neutral-primary-strong: #2c2c35;
      --neutral-secondary-soft: #111116;
      --neutral-secondary: #0d0d12;
      --neutral-secondary-medium: #1a1a21;
      --neutral-secondary-strong: #2c2c35;
      --neutral-tertiary-soft: #111116;
      --neutral-tertiary: #1a1a21;
      --neutral-tertiary-medium: #2c2c35;
      --neutral-quaternary: #2c2c35;
      --quaternary-medium: #3f3f48;
      --gray: #3f3f48;
      --brand-softer: #2a0a11;
      --brand-soft: #3a0e17;
      --brand: #ff5a6e;
      --brand-medium: #4a121d;
      --brand-strong: #fa2d48;
      --heading: #f5f5f7;
      --body: #9394a1;
      --body-subtle: #9394a1;
      --fg-brand: #ff6b7e;
      --fg-brand-strong: #ffb3be;
      --border-default: #1f1f25;
      --border-default-medium: #2c2c35;
      --border-default-strong: #3f3f48;
      --border-brand: #ff5a6e;
      --border-brand-subtle: #4a121d;
      --color-1-400: rgb(255 255 255 / 0.08);
      --color-1-700: rgb(0 0 0 / 0.15);
    }
  }

  * { box-sizing: border-box; }
  html, body, #root { margin: 0; min-height: 100%; }
  body {
    font-family: 'Lato', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(1200px 600px at 12% -10%, color-mix(in srgb, var(--brand) 20%, transparent), transparent 60%),
      radial-gradient(900px 500px at 100% 0%, color-mix(in srgb, var(--brand-strong) 12%, transparent), transparent 55%),
      var(--neutral-secondary-soft);
    background-attachment: fixed;
    color: var(--body);
    -webkit-font-smoothing: antialiased;
  }
  button, input { font: inherit; color: inherit; }
  button { border: 0; background: none; cursor: pointer; }
  :focus-visible { outline: none; box-shadow: 0 0 0 3px var(--brand-medium); }
  h1, h2, h3, p { margin: 0; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
