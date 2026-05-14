import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark-gold' | 'royal-white' | 'modern-dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    if (savedTheme) return savedTheme;
    return 'royal-white'; // Default
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    // Remove all previous theme classes
    document.body.classList.remove('theme-dark-gold', 'theme-royal-white', 'theme-modern-dark');
    // Add the active theme class
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
