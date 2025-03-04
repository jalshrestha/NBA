import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // When mounted on client, we can show the UI
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center w-10 h-10 p-2 rounded-full transition-all duration-300 
                text-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 
                hover:scale-110 focus:outline-none"
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' ? '🌙' : '🌞'}
    </button>
  );
};

export default ThemeToggle; 