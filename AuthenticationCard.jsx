import React, { useState } from 'react';
import './App.css';

/**
 * Momentum Coaching Classes - Clean Multi-Tab Authentication Component
 * Implements:
 * 1. Top Role Switcher: "Student Access" vs "Faculty (Admin)"
 * 2. Sub-Mode Switcher: "Student Login" vs "New Student Sign-Up"
 * 3. Dynamic Field Rendering and Highlighted Active Tab States
 */
export function AuthenticationCard({ onLoginSuccess }) {
  // Top-level Role State ('student' | 'teacher')
  const [role, setRole] = useState('student');

  // Student Sub-Mode State ('login' | 'register' | 'credentials')
  const [studentMode, setStudentMode] = useState('login');

  // Form Field States
  const [studentLogin, setStudentLogin] = useState({ loginId: '', password: '' });
  const [studentRegister, setStudentRegister] = useState({ name: '', className: '', mobile: '' });
  const [facultyLogin, setFacultyLogin] = useState({ identifier: '', password: '' });

  // Credentials and Feedback State
  const [credentials, setCredentials] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear feedback when switching tabs
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setFeedback({ message: '', type: '' });
    if (newRole === 'student' && studentMode === 'credentials') {
      setStudentMode('login');
    }
  };

  const handleStudentModeChange = (newMode) => {
    setStudentMode(newMode);
    setFeedback({ message: '', type: '' });
  };

  // 1. Student Login via Unique ID and Password
  const onStudentIdLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });
    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: studentLogin.loginId.trim().toUpperCase(),
          password: studentLogin.password.trim(),
        }),
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
        setFeedback({ message: data.message || 'Invalid credentials.', type: 'error' });
      }
    } catch {
      setFeedback({ message: 'Server connection error.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. New Student Sign-Up
  const onStudentSignUp = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });
    try {
      const res = await fetch('/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentRegister),
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
        setFeedback({ message: data.message || 'Registration failed.', type: 'error' });
      }
    } catch {
      setFeedback({ message: 'Server error during sign up.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Faculty / Admin Login
  const onFacultyLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });
    try {
      const res = await fetch('/api/teacher/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: facultyLogin.identifier.trim(),
          password: facultyLogin.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess({
          type: 'teacher',
          name: data.teacher.name,
          email: data.teacher.email,
          token: 'token-teach-' + Date.now(),
        });
      } else {
        setFeedback({ message: data.message || 'Invalid faculty credentials.', type: 'error' });
      }
    } catch {
      setFeedback({ message: 'Server connection error.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      
      {/* 1. TOP ROLE SWITCHER TABS */}
      <div className="modal-role-switch">
        <button
          type="button"
          className={`role-switch-btn ${role === 'student' ? 'active' : ''}`}
          onClick={() => handleRoleChange('student')}
        >
          <i className="fa-solid fa-user-graduate"></i> Student Access
        </button>
        <button
          type="button"
          className={`role-switch-btn ${role === 'teacher' ? 'active' : ''}`}
          onClick={() => handleRoleChange('teacher')}
        >
          <i className="fa-solid fa-chalkboard-user"></i> Faculty (Admin)
        </button>
      </div>

      {/* 2. STUDENT PORTAL MODE */}
      {role === 'student' && (
        <div className="role-form-container">
          
          {/* Sub-Mode Switcher */}
          {studentMode !== 'credentials' && (
            <div className="student-subtabs">
              <button
                type="button"
                className={`subtab-btn ${studentMode === 'login' ? 'active' : ''}`}
                onClick={() => handleStudentModeChange('login')}
              >
                <i className="fa-solid fa-key"></i> Student Login
              </button>
              <button
                type="button"
                className={`subtab-btn ${studentMode === 'register' ? 'active' : ''}`}
                onClick={() => handleStudentModeChange('register')}
              >
                <i className="fa-solid fa-user-plus"></i> New Student Sign-Up
              </button>
            </div>
          )}

          {/* Sub-View: Returning Login */}
          {studentMode === 'login' && (
            <form onSubmit={onStudentIdLogin}>
              <div className="modal-form-intro">
                <h4>Student Portal Login</h4>
                <p>Enter your unique Login ID and Password to unlock your study notes.</p>
              </div>

              <div className="modal-field">
                <label className="form-label">Student Login ID</label>
                <div className="input-with-icon">
                  <i className="fa-solid fa-id-card input-icon"></i>
                  <input
                    type="text"
                    className="form-control with-icon"
                    placeholder="e.g. MOM2026001"
                    value={studentLogin.loginId}
                    onChange={(e) => setStudentLogin({ ...studentLogin, loginId: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-field">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <i className="fa-solid fa-lock input-icon"></i>
                  <input
                    type="password"
                    className="form-control with-icon"
                    placeholder="Enter your password"
                    value={studentLogin.password}
                    onChange={(e) => setStudentLogin({ ...studentLogin, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-large w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Log In to Study Notes'}
              </button>

              <div className="subview-footer-help">
                <span>First time here? </span>
                <a href="#register" onClick={(e) => { e.preventDefault(); handleStudentModeChange('register'); }}>
                  Register &amp; Get your unique ID
                </a>
              </div>
            </form>
          )}

          {/* Sub-View: First-Time Registration */}
          {studentMode === 'register' && (
            <form onSubmit={onStudentSignUp}>
              <div className="modal-form-intro">
                <h4>New Student Registration</h4>
                <p>Sign up once to generate your permanent unique Login ID &amp; Password.</p>
              </div>

              <div className="modal-field">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rahul Sharma"
                  value={studentRegister.name}
                  onChange={(e) => setStudentRegister({ ...studentRegister, name: e.target.value })}
                  required
                />
              </div>

              <div className="modal-field">
                <label className="form-label">Class / Standard</label>
                <select
                  className="form-control"
                  value={studentRegister.className}
                  onChange={(e) => setStudentRegister({ ...studentRegister, className: e.target.value })}
                  required
                >
                  <option value="" disabled>-- Select your class --</option>
                  <option value="Class 9th">Class 9th</option>
                  <option value="Class 10th">Class 10th (SSC / CBSE)</option>
                  <option value="Class 11th - Science">Class 11th - Science</option>
                  <option value="Class 12th - Science">Class 12th - Science</option>
                  <option value="Foundation Batch">Foundation Batch</option>
                </select>
              </div>

              <div className="modal-field">
                <label className="form-label">Mobile Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9881714171"
                  pattern="[0-9]{10}"
                  value={studentRegister.mobile}
                  onChange={(e) => setStudentRegister({ ...studentRegister, mobile: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-large w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account & Generate Credentials'}
              </button>

              <div className="subview-footer-help">
                <span>Already registered? </span>
                <a href="#login" onClick={(e) => { e.preventDefault(); handleStudentModeChange('login'); }}>
                  Log in with your ID &amp; Password
                </a>
              </div>
            </form>
          )}

          {/* Sub-View: Credentials Generated */}
          {studentMode === 'credentials' && credentials && (
            <div className="credentials-card">
              <h4>{credentials.isNew ? 'Registration Successful!' : 'Existing Record Found!'}</h4>
              <p>Please note down your official login credentials:</p>
              <div className="credentials-box">
                <div><strong>Login ID:</strong> <span>{credentials.loginId}</span></div>
                <div><strong>Password:</strong> <span>{credentials.password}</span></div>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-large w-full"
                onClick={() => onLoginSuccess(credentials.user)}
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. FACULTY (ADMIN) PORTAL MODE */}
      {role === 'teacher' && (
        <form onSubmit={onFacultyLogin} className="role-form-container">
          <div className="modal-form-intro">
            <h4>Faculty &amp; Administrator Login</h4>
            <p>Sign in with your verified faculty credentials to unlock the upload studio.</p>
          </div>

          <div className="modal-field">
            <label className="form-label">Faculty ID / Username / Email</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-user-shield input-icon"></i>
              <input
                type="text"
                className="form-control with-icon"
                placeholder="e.g. admin@momentum.edu or admin"
                value={facultyLogin.identifier}
                onChange={(e) => setFacultyLogin({ ...facultyLogin, identifier: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="modal-field">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-lock input-icon"></i>
              <input
                type="password"
                className="form-control with-icon"
                placeholder="Enter faculty password"
                value={facultyLogin.password}
                onChange={(e) => setFacultyLogin({ ...facultyLogin, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-gold btn-large w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating...' : 'Authenticate & Open Faculty Hub'}
          </button>
        </form>
      )}

      {/* Error or Status Feedback */}
      {feedback.message && (
        <div className={`form-feedback ${feedback.type}`}>{feedback.message}</div>
      )}

    </div>
  );
}
