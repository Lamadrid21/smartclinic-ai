"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("smartclinic_theme");
    const dark = saved !== "light";
    setIsDarkMode(dark);
    document.documentElement.classList.remove("light");
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("smartclinic_theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="px-3 py-1.5 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5"
    >
      <span>{isDarkMode ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{isDarkMode ? "Dark" : "Light"}</span>
    </button>
  );
}
