import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'pokeiq-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

let listeners: Array<(t: Theme) => void> = [];
let current: Theme = typeof window !== 'undefined' ? getInitial() : 'dark';

if (typeof window !== 'undefined') {
  applyTheme(current);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(current);

  useEffect(() => {
    const listener = (t: Theme) => setThemeState(t);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    current = t;
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
    listeners.forEach(l => l(t));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(current === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}