/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      dropShadow: {
        closeButton: "0 8px 64px rgba(255, 255, 255, 0.45)",
      },
      colors: {
        offwhite: "#FFFFE3",
      },
      animation: {
        slideIn: "slideIn .4s ease-out",
        slideOut: "slideOut .3s ease-out",
        descriptionSlideIn: "descriptionSlideIn .35s ease-out",
        galleryHeroSlideIn: "galleryHeroSlideIn .35s ease-out",
        fadeIn: "fadeIn 1.3s ease-in-out",
        fadeInFast: "fadeIn .3s ease-out",
        blobSpin: "blobSpin 200s infinite",
        buttonNotify: "buttonNotify 1s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "scale(0,1)" },
          "100%": { transform: "scale(1,1)" },
        },
        slideOut: {
          "0%": { transform: "scale(1,1)" },
          "100%": { transform: "scale(0,1)" },
        },
        descriptionSlideIn: {
          "0%": { opacity: "0", transform: "translate(0,32px)" },
          "100%": { opacity: "100" },
        },
        galleryHeroSlideIn: {
          "0%": { opacity: "0", transform: "translate(-8px,0px)" },
          "100%": { opacity: "100" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "100" },
        },
        blobSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        buttonNotify: {
          "0%": { transform: "scale(1,1)", opacity: "5" },
          "100%": { transform: "scale(1.5,1.5)", opacity: "0" },
        },
        transitionTimingFunction: {
          "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      },
    },
  },
  plugins: [],
};
