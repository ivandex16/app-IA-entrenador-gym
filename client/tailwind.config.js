/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1", // indigo-500
        accent: "#22d3ee", // cyan-400
        dark: "#0f172a", // slate-900
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(40px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out",
        fadeInUp: "fadeInUp 0.4s ease-out",
        slideUp: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        slideDown: "slideDown 0.3s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
