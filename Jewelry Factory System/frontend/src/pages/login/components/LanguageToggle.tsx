import type { LoginLanguage } from '../login.constants';

interface LanguageToggleProps {
  language: LoginLanguage;
  onChange: (language: LoginLanguage) => void;
}

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="login-language-toggle" aria-label="Language">
      <button
        type="button"
        className={language === 'TH' ? 'is-active' : ''}
        aria-pressed={language === 'TH'}
        onClick={() => onChange('TH')}
      >
        TH
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        className={language === 'EN' ? 'is-active' : ''}
        aria-pressed={language === 'EN'}
        onClick={() => onChange('EN')}
      >
        EN
      </button>
    </div>
  );
}
