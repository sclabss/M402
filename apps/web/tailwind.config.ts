import type { Config } from 'tailwindcss';

// M402 design tokens. See ARCHITECTURE.md / DESIGN.md for the reasoning
// behind the palette (the amber comes from the conventional dev-tools color
// for 4xx HTTP status codes -- a deliberate nod to x402 -- not a generic
// crypto-dashboard accent).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0C0F14',
        surface: '#151A21',
        line: '#262C36',
        text: {
          DEFAULT: '#EDEFF3',
          muted: '#8B92A1',
        },
        amber: {
          DEFAULT: '#E3A63D',
          soft: '#F0C878',
        },
        sage: {
          DEFAULT: '#6BAB94',
          soft: '#9FC9B9',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
