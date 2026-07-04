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
    if (savedTheme && ['dark-gold', 'royal-white', 'modern-dark'].includes(savedTheme)) return savedTheme;
    return 'royal-white'; // Default
  });

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSetTheme = (newTheme: Theme) => {
    if (newTheme === theme) return;
    
    // 1. Show loading screen immediately
    setIsTransitioning(true);
    
    // 2. Wait for React to render the overlay, then change the underlying CSS variables
    setTimeout(() => {
      setTheme(newTheme);
      
      // 3. Keep the loading screen visible for a short duration to ensure repaint & smooth feeling
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }, 50);
  };

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    // Remove all previous theme classes
    document.body.classList.remove('theme-dark-gold', 'theme-royal-white', 'theme-modern-dark');
    // Add the active theme class
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
      
      {isTransitioning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'var(--color-surface-0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'themeFadeIn 0.2s ease-out',
        }}>
          <div style={{
            width: 48, height: 48,
            border: '4px solid color-mix(in srgb, var(--color-brand-500) 20%, transparent)',
            borderTopColor: 'var(--color-brand-500)',
            borderRadius: '50%',
            animation: 'themeSpin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite'
          }} />
          <div style={{
            marginTop: 24,
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.15em',
            textTransform: 'capitalize'
          }}>
            Applying Theme
          </div>
          <style>{`
            @keyframes themeFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes themeSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
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
