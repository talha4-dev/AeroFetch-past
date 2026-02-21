import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

export default function NavBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6c63ff" />
                  <stop offset="100%" stopColor="#00d4aa" />
                </linearGradient>
              </defs>
              <path d="M14 2L24 8V20L14 26L4 20V8L14 2Z" fill="url(#logoGrad)" opacity="0.9" />
              <path d="M14 8v12M8 11.5l6 5.5 6-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="navbar-logo-text">Aero<span className="gradient-text">Fetch</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {!user && (
            <>
              <a href="/#how-it-works" className="navbar-link">How It Works</a>
              <a href="/#features" className="navbar-link">Features</a>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {user ? (
            <div className="navbar-user" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="navbar-avatar">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <span className="navbar-username">{user.name || user.email.split('@')[0]}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {menuOpen && (
                <div className="navbar-dropdown">
                  <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                    <span>📊</span> Dashboard
                  </Link>
                  <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link to="/auth" className="btn-ghost">Log In</Link>
              <Link to="/auth?mode=register" className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          height: var(--navbar-height);
          background: var(--bg-glass);
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border-bottom: 1px solid var(--border-light);
          transition: background var(--transition);
        }
        .navbar-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 24px;
          height: 100%; display: flex; align-items: center; gap: 24px;
        }
        .navbar-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-display); font-size: 20px; font-weight: 800;
          color: var(--text-primary); text-decoration: none; flex-shrink: 0;
        }
        .navbar-logo-icon { display: flex; align-items: center; justify-content: center; }
        .navbar-logo-text { letter-spacing: -0.02em; }
        .navbar-links { display: flex; align-items: center; gap: 4px; flex: 1; }
        .navbar-link {
          padding: 8px 14px; color: var(--text-secondary); font-size: 14px; font-weight: 500;
          border-radius: var(--radius-sm); transition: all var(--transition);
          text-decoration: none;
        }
        .navbar-link:hover { color: var(--brand-primary); background: var(--bg-hover); }
        .navbar-actions {
          display: flex; align-items: center; gap: 12px; margin-left: auto;
        }
        .theme-toggle {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--bg-card); border: 1px solid var(--border-color);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-secondary);
          transition: all var(--transition);
        }
        .theme-toggle:hover { color: var(--brand-primary); border-color: var(--brand-primary); transform: rotate(20deg); }
        .navbar-user {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px 6px 6px;
          background: var(--bg-card); border: 1px solid var(--border-color);
          border-radius: var(--radius-pill); cursor: pointer;
          transition: all var(--transition); position: relative;
          color: var(--text-primary); font-size: 14px; font-weight: 500;
        }
        .navbar-user:hover { border-color: var(--brand-primary); }
        .navbar-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--gradient-brand);
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 13px;
        }
        .navbar-username { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .navbar-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          width: 200px; background: var(--bg-card);
          border: 1px solid var(--border-color); border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg); overflow: hidden; z-index: 100;
          animation: dropdown-in 0.2s ease;
        }
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .navbar-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; color: var(--text-primary); font-size: 14px;
          text-decoration: none; cursor: pointer; background: none; border: none;
          width: 100%; transition: background var(--transiton-fast);
          font-family: var(--font-body);
        }
        .navbar-dropdown-item:hover { background: var(--bg-hover); }
        .navbar-dropdown-item.danger:hover { background: rgba(255,107,107,0.1); color: var(--brand-accent); }
        @media (max-width: 600px) {
          .navbar-links { display: none; }
          .navbar-username { display: none; }
          .navbar-inner { padding: 0 16px; }
          .navbar-user { padding: 4px; border: none; background: transparent; }
          .navbar-dropdown { right: -8px; width: 180px; }
        }
        @media (max-width: 350px) {
          .navbar-inner { padding: 0 8px; gap: 4px; }
          .navbar-logo { font-size: 15px; gap: 4px; }
          .navbar-logo-icon svg { width: 18px; height: 18px; }
          .navbar-actions { gap: 4px; }
          .theme-toggle { width: 30px; height: 30px; }
          .theme-toggle svg { width: 14px; height: 14px; }
          .btn-ghost { font-size: 12px; padding: 4px 6px; }
          .btn-primary { 
            padding: 6px 10px !important; 
            font-size: 12px !important; 
            letter-spacing: -0.01em;
          }
        }
      `}</style>
    </nav>
  );
}
