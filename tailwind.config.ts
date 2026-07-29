import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Calendar event category colors
        category: {
          exam: "#EF4444",      // 考试 - red
          meeting: "#F59E0B",   // 见面 - amber
          class: "#3B82F6",     // 课表 - blue
          work: "#8B5CF6",      // 工作 - purple
          personal: "#10B981",  // 个人 - green
          other: "#6B7280",     // 其他 - gray
        },
      },
      fontSize: {
        "2xs": "0.65rem",
      },
      spacing: {
        "18": "4.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
