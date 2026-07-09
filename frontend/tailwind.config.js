/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'bg-primary': '#0a0f1d',
                'bg-secondary': '#1e293b',
            }
        },
    },
    plugins: [],
}
