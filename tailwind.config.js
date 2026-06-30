/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        foreground: '#f8fafc',
        border: '#1e293b',
      },
      borderRadius: {
        '3xl': '1.875rem',
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(56, 189, 248, 0.3)',
      },
    },
  },
  plugins: [],
};
