import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * Momentum Coaching Classes - Student Authentication System (React Architecture)
 * Features:
 * 1. Persistent Login (Stay Signed In via localStorage token/session)
 * 2. Deduplication (Prevents duplicate entries for identical Name, Mobile & Class)
 * 3. First-Time Registration & Automatic ID/Password Generation (e.g. MOM2026001 / PASS)
 * 4. Secure Returning Login via Login ID and Password
 */

// --- 1. Header with Circular Official Logo ---
export function Header({ user, onSignOut }) {
  return (
    <header className="main-header">
      <div className="container header-container">
        <div className="brand-identity">
          <img
            src="/momentum-logo.jpg"
            alt="Momentum Logo"
            className="brand-logo-img"
          />
          <div className="brand-text-block">
            <h1 className="brand-title">MOMENTUM</h1>
            <span className="brand-subtitle">Coaching Classes</span>
            <span className="brand-motto-tag">Goregaon • Excellence in Science &amp; Maths</span>
          </div>
        </div>

        {user && (
          <nav className="header-nav">
            <div className="user-status-pill">
              <i className="fa-solid fa-user-circle"></i>
              <span>Welcome, {user.name} ({user.loginId || user.type})</span>
            </div>
            <button className="btn btn-outline" onClick={onSignOut}>
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Log Out</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

// --- 2. Authentication Screen with Sub-Tabs (Login vs Sign-Up vs Credentials) ---
export function AuthScreen({ onLoginSuccess }) {
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [studentMode, setStudentMode] = useState('login'); // 'login' | 'register' | 'credentials'
  
  // Form states
  const [loginForm, setLoginForm] = useState({ loginId: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', className: '', mobile: '' });
  const [credentials, setCredentials] = useState(null);
  const [feedback, setFeedback] = useState({ msg: '', type: '' });

  // Returning Student Login by ID & Password
  const handleIdLogin = async (e) => {
    e.preventDefault();
    setFeedback({ msg: '', type: '' });
    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess({
          type: 'student',
          name: data.student['Student Name'],
          className: data.student['Class'],
          mobile: data.student['Mobile Number'],
          loginId: data.student['Login ID'],
          token: data.token,
        });
      } else {
        setFeedback({ msg: data.message, type: 'error' });
      }
    } catch (err) {
      setFeedback({ msg: 'Server error. Please try again.', type: 'error' });
    }
  };

  // First-Time Registration & Credential Generation (With Deduplication)
  const handleSignUp = async (e) => {
    e.preventDefault();
    setFeedback({ msg: '', type: '' });
    try {
      const res = await fetch('/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (data.success) {
        setCredentials({
          loginId: data.student['Login ID'],
          password: data.student['Password'],
          user: {
            type: 'student',
            name: data.student['Student Name'],
            className: data.student['Class'],
            mobile: data.student['Mobile Number'],
            loginId: data.student['Login ID'],
            token: data.token,
          },
          isNew: data.isNew,
        });
        setStudentMode('credentials');
      } else {
        setFeedback({ msg: data.message, type: 'error' });
      }
    } catch (err) {
      setFeedback({ msg: 'Registration error.', type: 'error' });
    }
  };

  return (
    <div className="auth-landing-screen">
      <div className="container auth-screen-container">
        
        {/* Left Welcome Box */}
        <div className="auth-welcome-banner">
          <div className="auth-brand-badge">
            <img src="/momentum-logo.jpg" alt="Logo" className="auth-badge-logo" />
            <span>Official Study Notes Portal</span>
          </div>
          <h2 className="auth-title">Learn Today, Lead Tomorrow.</h2>
          <p className="auth-subtitle">
            Welcome to Momentum Coaching Classes, Goregaon. Sign in with your unique Login ID or register once to access verified study notes.
          </p>
        </div>

        {/* Right Form Card */}
        <div className="auth-card">
          <div className="modal-role-switch">
            <button
              className={`role-switch-btn ${role === 'student' ? 'active' : ''}`}
              onClick={() => { setRole('student'); setFeedback({ msg: '', type: '' }); }}
            >
              Student Access
            </button>
            <button
              className={`role-switch-btn ${role === 'teacher' ? 'active' : ''}`}
              onClick={() => { setRole('teacher'); setFeedback({ msg: '', type: '' }); }}
            >
              Faculty (Admin)
            </button>
          </div>

          {role === 'student' && (
            <div>
              {studentMode !== 'credentials' && (
                <div className="student-subtabs">
                  <button
                    className={`subtab-btn ${studentMode === 'login' ? 'active' : ''}`}
                    onClick={() => { setStudentMode('login'); setFeedback({ msg: '', type: '' }); }}
                  >
                    Student Login
                  </button>
                  <button
                    className={`subtab-btn ${studentMode === 'register' ? 'active' : ''}`}
                    onClick={() => { setStudentMode('register'); setFeedback({ msg: '', type: '' }); }}
                  >
                    New Student Sign-Up
                  </button>
                </div>
              )}

              {/* 1. Returning Login Form */}
              {studentMode === 'login' && (
                <form onSubmit={handleIdLogin}>
                  <h4>Student Portal Login</h4>
                  <div className="modal-field">
                    <label>Student Login ID</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. MOM2026001"
                      value={loginForm.loginId}
                      onChange={(e) => setLoginForm({ ...loginForm, loginId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-large w-full">
                    Log In to Study Notes
                  </button>
                  <div className="subview-footer-help">
                    <span>First time here? </span>
                    <button type="button" onClick={() => setStudentMode('register')}>
                      Register &amp; Get your unique ID
                    </button>
                  </div>
                </form>
              )}

              {/* 2. First-Time Registration Form */}
              {studentMode === 'register' && (
                <form onSubmit={handleSignUp}>
                  <h4>New Student Registration</h4>
                  <div className="modal-field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rahul Sharma"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Class / Standard</label>
                    <select
                      className="form-control"
                      value={regForm.className}
                      onChange={(e) => setRegForm({ ...regForm, className: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Class --</option>
                      <option value="Class 10th">Class 10th</option>
                      <option value="Class 11th - Science">Class 11th - Science</option>
                      <option value="Class 12th - Science">Class 12th - Science</option>
                    </select>
                  </div>
                  <div className="modal-field">
                    <label>Mobile Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9881714171"
                      pattern="[0-9]{10}"
                      value={regForm.mobile}
                      onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-large w-full">
                    Create Account &amp; Generate Credentials
                  </button>
                </form>
              )}

              {/* 3. Credentials Display Card */}
              {studentMode === 'credentials' && credentials && (
                <div className="credentials-card">
                  <h4>{credentials.isNew ? 'Registration Successful!' : 'Existing Record Found!'}</h4>
                  <p>Please note down your official login credentials:</p>
                  <div className="credentials-box">
                    <div>
                      <strong>Login ID:</strong> <span>{credentials.loginId}</span>
                    </div>
                    <div>
                      <strong>Password:</strong> <span>{credentials.password}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-gold btn-large w-full"
                    onClick={() => onLoginSuccess(credentials.user)}
                  >
                    Continue to Dashboard
                  </button>
                </div>
              )}

              {feedback.msg && (
                <div className={`form-feedback ${feedback.type}`}>{feedback.msg}</div>
              )}
            </div>
          )}

          {role === 'teacher' && <div>{/* Faculty Form */}</div>}
        </div>
      </div>
    </div>
  );
}

// --- 3. Main Protected App Root ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persistent Login Guard: On mount, check if session is already saved in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('momentum_user');
    const token = localStorage.getItem('momentum_auth_token');

    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('momentum_user');
        localStorage.removeItem('momentum_auth_token');
      }
    }
    setLoading(false);
  }, []);

  // Save session securely to stay signed in until explicit sign out
  const handleLoginSuccess = (userData) => {
    localStorage.setItem('momentum_user', JSON.stringify(userData));
    localStorage.setItem('momentum_auth_token', userData.token);
    setCurrentUser(userData);
  };

  // Explicit Log Out: Clears persistent session
  const handleSignOut = () => {
    localStorage.removeItem('momentum_user');
    localStorage.removeItem('momentum_auth_token');
    setCurrentUser(null);
  };

  if (loading) return <div>Loading Momentum Portal...</div>;

  return (
    <div>
      <Header user={currentUser} onSignOut={handleSignOut} />
      {!currentUser ? (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <main className="dashboard-container">
          <h2>Welcome, {currentUser.name}!</h2>
          {/* Main notes explorer & download repository */}
        </main>
      )}
    </div>
  );
}
