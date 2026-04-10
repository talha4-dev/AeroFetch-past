import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import AnimatedBackground from '../components/AnimatedBackground';
import NavBar from '../components/NavBar';

// ─── IMPORTANT: Paste your Google OAuth Client ID here ───────────────────────
const GOOGLE_CLIENT_ID = '55324649796-07jisag08bcoacjc0epvr66btsoacumq.apps.googleusercontent.com';
// ─────────────────────────────────────────────────────────────────────────────

function validateEmail(email) {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

export default function AuthPage() {
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const { login, register, loginWithGoogle, user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => { if (user) navigate('/dashboard'); }, [user]);

    // Google Sign-In handler
    const handleGoogleSuccess = useCallback(async (response) => {
        setGoogleLoading(true);
        try {
            await loginWithGoogle(response.credential);
            addToast({ type: 'success', title: 'Welcome!', message: 'Signed in with Google.' });
            window.location.hash = '/dashboard';
        } catch (err) {
            const msg = err.response?.data?.error || 'Google sign-in failed. Please try again.';
            addToast({ type: 'error', title: 'Google Sign-In Failed', message: msg });
        } finally {
            setGoogleLoading(false);
        }
    }, [loginWithGoogle, addToast, navigate]);

    const handleGoogleClick = useCallback(() => {
        if (!window.google) {
            addToast({ type: 'error', title: 'Not Ready', message: 'Google script not loaded yet. Please wait.' });
            return;
        }
        if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
            addToast({ type: 'warning', title: 'Not Configured', message: 'Google OAuth Client ID is not set up yet.' });
            return;
        }
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSuccess,
        });
        window.google.accounts.id.prompt();
    }, [handleGoogleSuccess, addToast]);

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (mode === 'register' && !form.name.trim()) errs.name = 'Name is required';
        if (!validateEmail(form.email)) errs.email = 'Enter a valid email address';
        if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
        if (!/\d/.test(form.password)) errs.password = 'Password must include a number';
        if (mode === 'register' && form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(form.email, form.password);
                addToast({ type: 'success', title: 'Welcome back!', message: 'Logged in successfully.' });
            } else {
                await register(form.email, form.password, form.name);
                addToast({ type: 'success', title: 'Account Created!', message: 'Welcome to AeroFetch!' });
            }
            // Use hash-based navigation for compatibility with createHashRouter
            window.location.hash = '/dashboard';
        } catch (err) {
            const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
            addToast({ type: 'error', title: mode === 'login' ? 'Login Failed' : 'Registration Failed', message: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <AnimatedBackground />
            <NavBar />

            <div className="auth-container">
                <div className="auth-card glass-card">
                    {/* Logo */}
                    <Link to="/" className="auth-logo">
                        <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
                            <defs>
                                <linearGradient id="authLogoGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#6c63ff" />
                                    <stop offset="100%" stopColor="#00d4aa" />
                                </linearGradient>
                            </defs>
                            <path d="M14 2L24 8V20L14 26L4 20V8L14 2Z" fill="url(#authLogoGrad)" opacity="0.9" />
                            <path d="M14 8v12M8 11.5l6 5.5 6-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span><span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px' }}>Aero</span><span className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px' }}>Fetch</span></span>
                    </Link>

                    {/* Tab switcher */}
                    <div className="auth-tabs">
                        <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>
                            Sign In
                        </button>
                        <button className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>
                            Create Account
                        </button>
                    </div>

                    <div className="auth-heading">
                        <h2>{mode === 'login' ? 'Welcome back' : 'Join AeroFetch'}</h2>
                        <p>{mode === 'login' ? 'Sign in to access your dashboard and history' : 'Create your free account and start downloading'}</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
                        {mode === 'register' && (
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className={`input-field${errors.name ? ' error' : ''}`}
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    autoComplete="name"
                                />
                                {errors.name && <p className="form-error">{errors.name}</p>}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className={`input-field${errors.email ? ' error' : ''}`}
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => updateField('email', e.target.value)}
                                autoComplete="email"
                            />
                            {errors.email && <p className="form-error">{errors.email}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className={`input-field${errors.password ? ' error' : ''}`}
                                placeholder="Min. 8 characters, include a number"
                                value={form.password}
                                onChange={e => updateField('password', e.target.value)}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                            {errors.password && <p className="form-error">{errors.password}</p>}
                        </div>

                        {mode === 'register' && (
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    className={`input-field${errors.confirmPassword ? ' error' : ''}`}
                                    placeholder="Repeat your password"
                                    value={form.confirmPassword}
                                    onChange={e => updateField('confirmPassword', e.target.value)}
                                    autoComplete="new-password"
                                />
                                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                            </div>
                        )}

                        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                            {loading ? <span className="spinner white" /> : null}
                            {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In →' : 'Create Account →')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="auth-divider"><span>or</span></div>

                    {/* Google Sign-In Button */}
                    <button
                        className="google-btn"
                        onClick={handleGoogleClick}
                        disabled={googleLoading}
                        id="google-signin-btn"
                    >
                        {googleLoading ? (
                            <span className="spinner google-spinner" />
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.04 29.53 1 24 1 14.82 1 7.07 6.55 3.96 14.32l7.08 5.5C12.73 13.66 17.93 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.09-.4-4.56H24v8.63h12.67C35.8 32.8 32.56 35.5 28.3 37l6.87 5.33C39.86 38.19 46.5 32.14 46.5 24.5z" />
                                <path fill="#FBBC05" d="M11.04 28.18A14.56 14.56 0 0 1 9.5 24c0-1.46.25-2.87.69-4.18l-7.08-5.5A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.57 10.76l8.47-6.58z" />
                                <path fill="#34A853" d="M24 47c5.53 0 10.18-1.83 13.56-4.97l-6.87-5.33C28.9 38.1 26.6 39 24 39c-6.07 0-11.27-4.16-13.13-9.82l-8.47 6.58C5.96 42.44 14.39 47 24 47z" />
                            </svg>
                        )}
                        <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
                    </button>

                    <p className="auth-switch">
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button className="auth-switch-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                            {mode === 'login' ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>

            <style>{`
        .auth-page { min-height: 100vh; display: flex; flex-direction: column; }
        .auth-container {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: calc(var(--navbar-height) + 40px) 24px 60px;
          position: relative; z-index: 1;
        }
        .auth-card {
          width: 100%; max-width: 460px;
          padding: 40px 40px; display: flex; flex-direction: column; gap: 24px;
          animation: card-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; justify-content: center; }
        .auth-tabs {
          display: flex; background: var(--bg-primary); border-radius: var(--radius-pill);
          padding: 4px; gap: 4px;
        }
        .auth-tab {
          flex: 1; padding: 10px; border: none; border-radius: var(--radius-pill);
          background: none; cursor: pointer; font-size: 14px; font-weight: 600;
          color: var(--text-muted); transition: all var(--transition); font-family: var(--font-body);
        }
        .auth-tab.active {
          background: var(--bg-card); color: var(--brand-primary);
          box-shadow: var(--shadow-sm);
        }
        .auth-heading { text-align: center; }
        .auth-heading h2 { font-size: 22px; font-weight: 800; }
        .auth-heading p { font-size: 14px; color: var(--text-secondary); margin-top: 6px; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .form-error { font-size: 12px; color: var(--brand-accent); margin-top: 4px; }
        .auth-submit { width: 100%; padding: 16px; font-size: 15px; }
        .auth-divider {
          display: flex; align-items: center; gap: 12px;
          color: var(--text-muted); font-size: 12px; font-weight: 600;
        }
        .auth-divider::before, .auth-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border-light);
        }
        .google-btn {
          width: 100%; padding: 13px 20px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          background: var(--bg-card);
          border: 1.5px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 15px; font-weight: 600; font-family: var(--font-body);
          color: var(--text-primary);
          transition: all var(--transition);
          position: relative;
        }
        .google-btn:hover:not(:disabled) {
          border-color: #4285f4;
          background: rgba(66, 133, 244, 0.05);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(66, 133, 244, 0.15);
        }
        .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .google-spinner {
          border-color: rgba(66,133,244,0.3);
          border-top-color: #4285f4;
        }
        .auth-switch { text-align: center; font-size: 14px; color: var(--text-muted); }
        .auth-switch-btn { background: none; border: none; color: var(--brand-primary); font-weight: 700; cursor: pointer; font-size: 14px; }
        .auth-switch-btn:hover { text-decoration: underline; }
        .spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          animation: spin 0.8s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 500px) {
          .auth-card { padding: 28px 20px; }
        }
      `}</style>
        </div>
    );
}
