/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        brand: {
          dark: '#0f172a',
          navy: '#1e293b',
          blue: '#2563eb',
          green: '#16a34a',
          light: '#f8fafc',
        },
        // Theme-aware surface tokens — one variable flip (see globals.css)
        // covers both light and dark instead of a `dark:` class per element.
        canvas:      'var(--canvas)',
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink:         'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        line:        'var(--line)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};
