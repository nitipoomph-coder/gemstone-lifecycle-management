import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/authAPI';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!username) {
        setErrorMsg('Please enter Username');
        setIsLoading(false);
        return;
      }

      const response = await authAPI.login(username.toUpperCase(), password);
      if (response.success) {
        localStorage.setItem('auth_role', response.role);
        localStorage.setItem('auth_user', response.username);
        if (response.role === 'admin') {
          navigate('/');
        } else {
          navigate('/dashboard/customer');
        }
      } else {
        setErrorMsg(response.message || 'Invalid username or password');
      }
    } catch (err) {
      setErrorMsg('System error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Use styles from index.css instead of inline

  return (
    <div className="login-page-theme" style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-surface-0)',
      backgroundImage: 'url(/assets/bg-gemstone.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Dark Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--color-surface-1)',
        opacity: 0.6,
        zIndex: 0
      }} />

      {/* Glassmorphism Card Wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 420,
        padding: '48px 32px',
        margin: '20px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 24,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <h1 style={{
          color: 'var(--color-text-primary)',
          fontSize: '1.85rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          Jewelry Factory System
        </h1>

        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '1rem',
          fontWeight: 400,
          marginBottom: 40,
        }}>
          Sign in to your account
        </p>

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)',
              border: '1px solid var(--color-danger-500)',
              color: 'var(--color-danger-500)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* Username Input */}
          <div className="floating-container" style={{ animation: 'fadeInUp 0.3s ease' }}>
            <input
              type="text"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="login-input"
            />
            <fieldset className="floating-fieldset">
              <legend className="floating-legend">
                <span>Username</span>
              </legend>
            </fieldset>
            <label className="floating-label">Username</label>
          </div>

          {/* Password Input */}
          <div className="floating-container" style={{ animation: 'fadeInUp 0.4s ease' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="login-input"
              style={{ paddingRight: 50 }}
            />
            <fieldset className="floating-fieldset">
              <legend className="floating-legend">
                <span>Password</span>
              </legend>
            </fieldset>
            <label className="floating-label">Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                transition: 'color 0.2s',
                zIndex: 2,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Links Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, padding: '0 10px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }} style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              transition: 'opacity 0.2s'
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 50,
              background: 'var(--color-brand-500)',
              color: 'var(--color-text-inverse)',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 10,
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'var(--color-brand-400)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 118, 255, 0.23)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--color-brand-500)';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(0, 118, 255, 0.39)';
              }
            }}
          >
            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: '40px 32px',
            width: '90%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(59, 158, 232, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24
            }}>
              <Headset size={32} color="#3B9EE8" />
            </div>

            <h2 style={{
              color: 'var(--color-text-primary)',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: 12,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}>
              Contact Team IT Support
            </h2>

            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              marginBottom: 32,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}>
              For security purposes, all password reset requests must be handled by the team.<br /><br />
              <strong style={{ color: '#3B9EE8' }}>IT Support Only</strong>
            </p>

            <button
              onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 50,
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
