import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowLeft, Headset } from 'lucide-react';
import { authAPI } from '../services/authAPI';

const BACKGROUND_IMAGES = [
  '/assets/cll_blue_geode.png',
  '/assets/cll_plate.png',
  '/assets/cll_holding_charms.png',
  '/assets/cll_green_geode.png',
  '/assets/cll_hand_ring.png',
  '/assets/cll_ring_earring.png',
  '/assets/cll_box.png',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRequestAccess, setIsRequestAccess] = useState(false);
  const [lang, setLang] = useState<'TH' | 'EN'>('EN');
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    // Force default royal-white theme for login page to avoid invisible text from dark themes
    localStorage.setItem('app-theme', 'royal-white');
    document.body.classList.remove('theme-dark-gold', 'theme-modern-dark');
    document.body.classList.add('theme-royal-white');

    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Register State
  const [reqName, setReqName] = useState('');
  const [reqUsername, setReqUsername] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqDepartment, setReqDepartment] = useState('');
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminAuthPwd, setAdminAuthPwd] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const t = {
    EN: {
      brand: 'CLL JEWELRY',
      brandEst: 'EST. 2022',
      brandSubtitle: 'Sustainable & Ethical Jewelry',
      loginTitle: 'Jewelry Factory System',
      loginSub: 'Sign in to your account',
      username: 'Username',
      password: 'Password',
      reqAccessLink: 'Register Account',
      forgotPwd: 'Forgot Password?',
      signInBtn: 'SIGN IN',
      signingIn: 'SIGNING IN...',
      reqAccessTitle: 'Register New Account',
      reqAccessSub: 'Admin authorization required to create a new user.',
      fullName: 'Full Name',
      department: 'Department',
      submitReqBtn: 'CREATE ACCOUNT',
      backToLogin: 'Back to Login',
      errUsername: 'Please enter Username',
      errInvalid: 'Invalid username or password',
      errSys: 'System error. Please try again.',
      reqSent: 'Registration successful.'
    },
    TH: {
      brand: 'CLL JEWELRY',
      brandEst: 'EST. 2022',
      brandSubtitle: 'เครื่องประดับที่ยั่งยืนและมีจริยธรรม',
      loginTitle: 'ระบบโรงงานเครื่องประดับ',
      loginSub: 'เข้าสู่ระบบบัญชีของคุณ',
      username: 'ชื่อผู้ใช้',
      password: 'รหัสผ่าน',
      reqAccessLink: 'ลงทะเบียนเข้าใช้งาน',
      forgotPwd: 'ลืมรหัสผ่าน?',
      signInBtn: 'เข้าสู่ระบบ',
      signingIn: 'กำลังเข้าสู่ระบบ...',
      reqAccessTitle: 'ลงทะเบียนผู้ใช้ใหม่',
      reqAccessSub: 'สำหรับผู้ดูแลระบบหรือพนักงานที่ได้รับสิทธิ์เท่านั้น',
      fullName: 'ชื่อ - นามสกุล',
      department: 'แผนก / ตำแหน่ง',
      submitReqBtn: 'สร้างบัญชี',
      backToLogin: 'กลับไปหน้าเข้าสู่ระบบ',
      errUsername: 'กรุณากรอกชื่อผู้ใช้',
      errInvalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      errSys: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง',
      reqSent: 'สร้างบัญชีเรียบร้อยแล้ว'
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!username) {
        setErrorMsg(t[lang].errUsername);
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
        setErrorMsg(response.message || t[lang].errInvalid);
      }
    } catch (err) {
      setErrorMsg(t[lang].errSys);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminLoading(true);

    try {
      const response = await authAPI.verifyAdmin(adminAuthPwd);
      setIsAdminLoading(false);

      if (response.success) {
        setShowAdminAuthModal(false);
        setAdminAuthPwd('');
        setIsRequestAccess(true);
      } else {
        setShowAdminAuthModal(false);
        setAdminAuthPwd('');
        setErrorMsg(lang === 'EN' ? 'Invalid Admin Password. Access Denied.' : 'รหัสผ่าน Admin ไม่ถูกต้อง');
      }
    } catch (err) {
      setIsAdminLoading(false);
      setShowAdminAuthModal(false);
      setAdminAuthPwd('');
      setErrorMsg(t[lang].errSys);
    }
  };

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    alert(t[lang].reqSent);
    setIsRequestAccess(false);
    setReqName('');
    setReqUsername('');
    setReqPassword('');
    setReqDepartment('');
  };

  return (
    <div className="login-split-layout" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: '"Noto Serif Thai", "Fraunces", serif',
      backgroundColor: '#f3eee3',
      position: 'relative'
    }}>
      {/* LEFT/RIGHT: Branding Cover (Image) */}
      <div className="login-cover-panel" style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '50%',
        backgroundColor: '#15120e',
        zIndex: 10,
        boxShadow: isRequestAccess ? '-10px 0 30px rgba(0,0,0,0.5)' : '10px 0 30px rgba(0,0,0,0.5)',
        transform: isRequestAccess ? 'translateX(100%)' : 'translateX(0)',
        transition: 'transform 0.6s cubic-bezier(0.8, 0, 0.2, 1), box-shadow 0.6s ease',
        overflow: 'hidden'
      }}>
        {BACKGROUND_IMAGES.map((img, idx) => (
          <div key={img} style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: bgIndex === idx ? 1 : 0,
            transform: bgIndex === idx ? 'scale(1.05)' : 'scale(1)',
            transitionProperty: 'opacity, transform',
            transitionDuration: '1.5s, 6s',
            transitionTimingFunction: 'ease-in-out, linear'
          }}></div>
        ))}
      </div>

      {/* RIGHT/LEFT: Interactive Panels Area (Parchment) */}
      <div className="login-forms-container parchment-texture-bg" style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: '50%',
        backgroundColor: '#f3eee3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isRequestAccess ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.6s cubic-bezier(0.8, 0, 0.2, 1)',
        zIndex: 5
      }}>
        {/* Language Toggle */}
        <div style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          display: 'flex',
          gap: '8px',
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.85rem',
          fontWeight: 500,
          zIndex: 50
        }}>
          <span
            onClick={() => setLang('TH')}
            style={{
              cursor: 'pointer',
              color: lang === 'TH' ? '#322c24' : '#948c7e',
              transition: 'color 0.2s'
            }}>TH</span>
          <span style={{ color: '#948c7e' }}>|</span>
          <span
            onClick={() => setLang('EN')}
            style={{
              cursor: 'pointer',
              color: lang === 'EN' ? '#322c24' : '#948c7e',
              transition: 'color 0.2s'
            }}>EN</span>
        </div>

        {/* Sliding Forms Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          height: 500,
          display: 'flex'
        }}>
          {/* LOGIN FORM */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            transition: 'transform 0.6s cubic-bezier(0.8, 0, 0.2, 1), opacity 0.4s ease',
            transform: isRequestAccess ? 'translateX(-50px)' : 'translateX(0)',
            opacity: isRequestAccess ? 0 : 1,
            pointerEvents: isRequestAccess ? 'none' : 'auto'
          }}>
            <h2 className="stagger-1" style={{
              color: '#15120e',
              fontSize: '2rem',
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}>
              {t[lang].loginTitle}
            </h2>
            <p className="stagger-2" style={{
              color: '#8a5f37',
              fontSize: '1rem',
              marginBottom: '2.5rem',
              fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
            }}>
              {t[lang].loginSub}
            </p>

            <form onSubmit={handleLogin} className="parchment-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
              {errorMsg && (
                <div className="stagger-3" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 4,
                  background: 'rgba(220, 38, 38, 0.05)',
                  borderLeft: '3px solid #dc2626',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}

              <div className="floating-container stagger-3">
                <input
                  type="text"
                  placeholder=" "
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="login-input"
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{t[lang].username}</span></legend>
                </fieldset>
                <label className="floating-label">{t[lang].username}</label>
              </div>

              <div className="floating-container stagger-4">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="login-input"
                  style={{ paddingRight: 40 }}
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{t[lang].password}</span></legend>
                </fieldset>
                <label className="floating-label">{t[lang].password}</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#948c7e',
                    cursor: 'pointer',
                    zIndex: 2,
                    padding: 4
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="stagger-5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: '"Inter", sans-serif' }}>
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8a5f37',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                    padding: 0
                  }}
                >
                  {t[lang].reqAccessLink}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#322c24',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {t[lang].forgotPwd}
                </button>
              </div>

              <div className="elegant-divider stagger-5"></div>

              <button
                type="submit"
                disabled={isLoading}
                className="luxury-btn stagger-6"
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '16px',
                  background: '#322c24',
                  color: '#f3eee3',
                  border: '1px solid #15120e',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = '#15120e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = '#322c24';
                  }
                }}
              >
                {isLoading ? t[lang].signingIn : t[lang].signInBtn}
              </button>
            </form>
          </div>

          {/* REQUEST ACCESS FORM */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            transition: 'transform 0.6s cubic-bezier(0.8, 0, 0.2, 1), opacity 0.4s ease',
            transform: isRequestAccess ? 'translateX(0)' : 'translateX(50px)',
            opacity: isRequestAccess ? 1 : 0,
            pointerEvents: isRequestAccess ? 'auto' : 'none'
          }}>
            <button
              type="button"
              onClick={() => setIsRequestAccess(false)}
              className="stagger-1"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                color: '#8a5f37',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginBottom: '2rem',
                padding: 0,
                fontFamily: '"Inter", sans-serif'
              }}
            >
              <ArrowLeft size={16} />
              {t[lang].backToLogin}
            </button>

            <h2 className="stagger-2" style={{
              color: '#15120e',
              fontSize: '1.75rem',
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}>
              {t[lang].reqAccessTitle}
            </h2>
            <p className="stagger-3" style={{
              color: '#8a5f37',
              fontSize: '0.9rem',
              marginBottom: '2rem',
              fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
            }}>
              {t[lang].reqAccessSub}
            </p>

            <form onSubmit={handleRequestAccess} className="parchment-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
              <div className="floating-container stagger-4">
                <input
                  type="text"
                  placeholder=" "
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  required
                  className="login-input"
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{t[lang].fullName}</span></legend>
                </fieldset>
                <label className="floating-label">{t[lang].fullName}</label>
              </div>

              <div className="floating-container stagger-5">
                <input
                  type="text"
                  placeholder=" "
                  value={reqUsername}
                  onChange={(e) => setReqUsername(e.target.value)}
                  required
                  className="login-input"
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{t[lang].username}</span></legend>
                </fieldset>
                <label className="floating-label">{t[lang].username}</label>
              </div>

              <div className="floating-container stagger-5">
                <input
                  type="password"
                  placeholder=" "
                  value={reqPassword}
                  onChange={(e) => setReqPassword(e.target.value)}
                  required
                  className="login-input"
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{t[lang].password}</span></legend>
                </fieldset>
                <label className="floating-label">{t[lang].password}</label>
              </div>

              <div className="floating-container stagger-6">
                <input
                  type="text"
                  placeholder=" "
                  value={reqDepartment}
                  onChange={(e) => setReqDepartment(e.target.value)}
                  required
                  className="login-input"
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{t[lang].department}</span></legend>
                </fieldset>
                <label className="floating-label">{t[lang].department}</label>
              </div>

              <div className="elegant-divider stagger-7"></div>

              <button
                type="submit"
                className="luxury-btn stagger-7"
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '16px',
                  background: '#c9a875',
                  color: '#15120e',
                  border: '1px solid #8a5f37',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e3cfa3'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#c9a875'}
              >
                {t[lang].submitReqBtn}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Admin Auth Modal */}
      {showAdminAuthModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#f3eee3',
            padding: '2rem',
            borderRadius: 8,
            width: '90%',
            maxWidth: 400,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Loading Overlay */}
            {isAdminLoading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(243, 238, 227, 0.75)',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backdropFilter: 'blur(3px)'
              }}>
                <div className="dot-loader">
                  <div></div><div></div><div></div>
                </div>
              </div>
            )}

            <h3 style={{ margin: '0 0 1rem 0', color: '#15120e', fontFamily: '"Inter", sans-serif' }}>
              {lang === 'EN' ? 'Admin Authorization' : 'ยืนยันสิทธิ์ผู้ดูแลระบบ'}
            </h3>
            <p style={{ color: '#8a5f37', fontSize: '0.9rem', marginBottom: '1.5rem', fontFamily: '"Inter", "Noto Sans Thai", sans-serif' }}>
              {lang === 'EN' ? 'Please enter the admin password to access registration.' : 'กรุณากรอกรหัสผ่าน Admin เพื่อเข้าสู่หน้าลงทะเบียน'}
            </p>
            <form onSubmit={handleAdminAuthSubmit}>
              <div className="floating-container">
                <input
                  type="password"
                  placeholder=" "
                  value={adminAuthPwd}
                  onChange={(e) => setAdminAuthPwd(e.target.value)}
                  className="login-input"
                  required
                  autoFocus
                />
                <fieldset className="floating-fieldset">
                  <legend className="floating-legend"><span>{lang === 'EN' ? 'Admin Password' : 'รหัสผ่าน Admin'}</span></legend>
                </fieldset>
                <label className="floating-label">{lang === 'EN' ? 'Admin Password' : 'รหัสผ่าน Admin'}</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowAdminAuthModal(false); setAdminAuthPwd(''); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid #8a5f37',
                    color: '#8a5f37',
                    cursor: 'pointer',
                    fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
                  }}
                >
                  {lang === 'EN' ? 'Cancel' : 'ยกเลิก'}
                </button>
                <button
                  type="submit"
                  className="luxury-btn"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#c9a875',
                    border: '1px solid #8a5f37',
                    color: '#15120e',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
                  }}
                >
                  {lang === 'EN' ? 'Proceed' : 'ยืนยัน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#15120e',
            border: '1px solid #322c24',
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
              background: 'rgba(201, 168, 117, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24
            }}>
              <Headset size={32} color="#c9a875" />
            </div>

            <h2 style={{
              color: '#f3eee3',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: 12,
              fontFamily: '"Inter", sans-serif'
            }}>
              Contact IT Support
            </h2>

            <p style={{
              color: '#948c7e',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              marginBottom: 32,
              fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
            }}>
              For security purposes, all password reset requests must be handled by the team.<br /><br />
              <strong style={{ color: '#c9a875' }}>IT Support Only</strong>
            </p>

            <button
              onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 50,
                background: 'transparent',
                border: '1px solid #322c24',
                color: '#f3eee3',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Noto Sans Thai", sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d1812';
                e.currentTarget.style.borderColor = '#c9a875';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#322c24';
              }}
            >
              {t[lang].backToLogin}
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* --- Luxury Enhancements --- */

        /* Premium Parchment Texture */
        .parchment-texture-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* Ambient Focus Glow */
        .parchment-form .login-input:focus ~ .floating-fieldset {
          box-shadow: 0 0 12px rgba(138, 95, 55, 0.25);
        }

        /* Elegant Dividers */
        .elegant-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(138, 95, 55, 0.3), transparent);
          margin: 0.5rem 0;
        }

        /* Golden Sweep Button Effect */
        .luxury-btn {
          position: relative;
          overflow: hidden;
        }
        .luxury-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
          transform: skewX(-25deg);
          transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .luxury-btn:hover::before {
          left: 150%;
        }

        /* Staggered Entrance Animation */
        @keyframes fadeUpStagger {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-1, .stagger-2, .stagger-3, .stagger-4, .stagger-5, .stagger-6, .stagger-7 {
          opacity: 0;
          animation: fadeUpStagger 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.15s; }
        .stagger-3 { animation-delay: 0.2s; }
        .stagger-4 { animation-delay: 0.25s; }
        .stagger-5 { animation-delay: 0.3s; }
        .stagger-6 { animation-delay: 0.35s; }
        .stagger-7 { animation-delay: 0.4s; }

        /* --- End Luxury Enhancements --- */
        
        /* Dot Loader */
        .dot-loader {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot-loader div {
          width: 10px;
          height: 10px;
          background-color: #8a5f37;
          border-radius: 50%;
          animation: dot-bounce 1.4s infinite ease-in-out both;
        }
        .dot-loader div:nth-child(1) { animation-delay: -0.32s; }
        .dot-loader div:nth-child(2) { animation-delay: -0.16s; }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 800px) {
          .login-split-layout {
            display: flex !important;
            flex-direction: column !important;
          }
          .login-cover-panel {
            position: relative !important;
            width: 100% !important;
            height: 35vh !important;
            transform: none !important;
          }
          .login-forms-container {
            position: relative !important;
            width: 100% !important;
            height: 65vh !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
