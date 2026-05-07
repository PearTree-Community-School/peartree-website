/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        pear: {
          50: '#fefdf5',
          100: '#fdf8e4',
          200: '#f9efc3',
          300: '#f4e098',
          400: '#ecc95e',
          500: '#daa520',
          600: '#c08b1a',
          700: '#9a6e17',
          800: '#7d581a',
          900: '#66481b',
        },
        forest: {
          50: '#f0f9f1',
          100: '#dbf0de',
          200: '#bae0c0',
          300: '#8cc99a',
          400: '#5aad6c',
          500: '#3a9150',
          600: '#2a753d',
          700: '#235d33',
          800: '#1f4a2b',
          900: '#1a3d24',
          950: '#0d2214',
        },
        earth: {
          50: '#faf6f0',
          100: '#f0e8d8',
          200: '#e0ceb0',
          300: '#ccaf82',
          400: '#b8915c',
          500: '#a87d4a',
          600: '#96683e',
          700: '#7c5235',
          800: '#664430',
          900: '#553929',
        },
        cream: '#FAF7F2',
        charcoal: '#2D2926',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
