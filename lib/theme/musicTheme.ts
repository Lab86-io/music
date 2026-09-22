// Music theme: matcha colors and fonts on the Astryx default scale.
//
// The Tailwind bridge maps every Tailwind spacing and text utility to the
// Astryx tokens of the active theme. Matcha ships a 6px spacing unit and a
// 16px / 1.25 type scale, which made every padding value 1.5 times larger and
// pushed small text down to 10px and 13px. This theme keeps the matcha look
// and puts the scale back to the values the Tailwind classes were written for:
// a 4px spacing unit and a text scale of 12 / 14 / 16 / 18 / 21 / 24 px.

import {defineTheme} from '@astryxdesign/core/theme';
import {matchaIconRegistry, matchaTheme} from '@astryxdesign/theme-matcha';

export const musicTheme = defineTheme({
  name: 'music',
  extends: matchaTheme,

  typography: {
    // 16 / 1.1425 rounds to 12, 14, 16, 18, 21, 24, 27, 31, 36.
    scale: {base: 16, ratio: 1.1425},
    body: {
      family: 'DM Sans',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'Playwrite US Trad',
      fallbacks: 'Georgia, "Times New Roman", Times, serif',
    },
    code: {
      family: 'JetBrains Mono',
      fallbacks: '"SF Mono", Monaco, Consolas, monospace',
    },
  },

  tokens: {
    // 4px spacing unit (Astryx default). Tailwind p-4 becomes 16px again.
    '--spacing-0-5': '2px',
    '--spacing-1': '4px',
    '--spacing-1-5': '6px',
    '--spacing-2': '8px',
    '--spacing-3': '12px',
    '--spacing-4': '16px',
    '--spacing-5': '20px',
    '--spacing-6': '24px',
    '--spacing-7': '28px',
    '--spacing-8': '32px',
    '--spacing-9': '36px',
    '--spacing-10': '40px',
    '--spacing-11': '44px',
    '--spacing-12': '48px',

    // Control heights back to the Astryx defaults.
    '--size-element-sm': '28px',
    '--size-element-md': '32px',
    '--size-element-lg': '36px',
  },

  icons: matchaIconRegistry,
});
