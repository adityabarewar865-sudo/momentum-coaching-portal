/**
 * Momentum Coaching Classes - Study Notes Portal Client Logic
 * Handles:
 * 1. Protected Routing & Auth Guard:
 *    - On launch, checks if user session exists in localStorage.
 *    - If NOT signed in: Renders the Sign-In / Register screen as the first screen.
 *    - If signed in: Bypasses login screen and directly renders main dashboard.
 *    - Sign Out: Clears session and redirects back to the login screen.
 * 2. Circular logo branding integration
 * 3. Student sign-in & Excel spreadsheet logging
 * 4. Teacher authentication & Privileged Note Upload
 * 5. Categorized Subject filtering & One-click direct note downloads
 */

// Global State
let currentUser = null; // { type: 'student'|'teacher', name: string, token: string, ... }
let currentSubjectFilter = 'all';
let allNotes = [];
let activeMainTab = 'notes'; // 'notes', 'upload', 'records'

// DOM Screen Elements
const authScreen = document.getElementById('authScreen');
const mainDashboardScreen = document.getElementById('mainDashboardScreen');

// Header Auth Elements
const authStatusBadge = document.getElementById('authStatusBadge');
const userStatusText = document.getElementById('userStatusText');
const logoutBtn = document.getElementById('logoutBtn');

// Dashboard Tabs & Controls
const teacherControlPanel = document.getElementById('teacherControlPanel');
const uploadTabBtn = document.getElementById('uploadTabBtn');
const recordsTabBtn = document.getElementById('recordsTabBtn');
const notesTabBtn = document.getElementById('notesTabBtn');

const notesGrid = document.getElementById('notesGrid');
const noNotesView = document.getElementById('noNotesView');
const activeFilterText = document.getElementById('activeFilterText');
const notesCountPill = document.getElementById('notesCountPill');
const noteSearchInput = document.getElementById('noteSearchInput');

// Role Switch Elements
const roleStudentToggle = document.getElementById('roleStudentToggle');
const roleTeacherToggle = document.getElementById('roleTeacherToggle');
const studentPortalContainer = document.getElementById('studentPortalContainer');
const facultyPortalContainer = document.getElementById('facultyPortalContainer');
const studentRegisterFeedback = document.getElementById('studentRegisterFeedback');
const teacherLoginFeedback = document.getElementById('teacherLoginFeedback');

// =========================================================================
// 1. APPLICATION BOOTSTRAP & AUTH GUARD (PROTECTED ROUTING)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndRoute();
});

/**
 * Checks session/token in localStorage and conditionally routes user
 */
function checkAuthAndRoute() {
  const savedUser = localStorage.getItem('momentum_user');
  
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      // Valid session found -> Directly render Dashboard
      renderDashboardScreen();
      fetchNotes();
    } catch (e) {
      console.error('Corrupted user session, clearing...', e);
      handleSignOut();
    }
  } else {
    // No session -> Render Sign-In / Register page as the very first screen
    renderAuthScreen();
  }
}

/**
 * Renders the Sign-In / Register Page as the first view
 */
function renderAuthScreen() {
  currentUser = null;
  authScreen.classList.remove('hidden');
  mainDashboardScreen.classList.add('hidden');

  // Reset to default Student Portal tab
  switchAuthRole('student');

  // Update Header to Guest/Unauthenticated state
  authStatusBadge.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  clearFormFeedbacks();
}

/**
 * Bypasses the login screen and renders the main dashboard
 */
function renderDashboardScreen() {
  if (!currentUser) return renderAuthScreen();

  authScreen.classList.add('hidden');
  mainDashboardScreen.classList.remove('hidden');

  // Configure Header Navigation & Badges
  authStatusBadge.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');

  if (currentUser.type === 'teacher') {
    userStatusText.innerHTML = `<strong>Teacher:</strong> ${escapeHtml(currentUser.name)}`;
    teacherControlPanel.classList.remove('hidden');
    uploadTabBtn.classList.remove('hidden');
    recordsTabBtn.classList.remove('hidden');
    fetchStudentStats();
  } else {
    userStatusText.innerHTML = `<strong>Student:</strong> ${escapeHtml(currentUser.name)} (${escapeHtml(currentUser.className || 'Verified')})`;
    teacherControlPanel.classList.add('hidden');
    uploadTabBtn.classList.add('hidden');
    recordsTabBtn.classList.add('hidden');
  }

  // Scroll to top of dashboard smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Sign Out: Clears user session and redirects back to Login Screen
 */
function handleLogout() {
  handleSignOut();
}

function handleSignOut() {
  // Clear persistent storage
  localStorage.removeItem('momentum_user');
  localStorage.removeItem('momentum_auth_token');
  currentUser = null;

  // Show Toast notification
  showToast('Signed out successfully. Redirecting to login...', 'info');

  // Immediately redirect to the Sign In / Register screen
  renderAuthScreen();
}

// =========================================================================
// 2. AUTHENTICATION & LOGIN FORM HANDLERS
// =========================================================================

/**
 * Switch role between 'student' (Student Portal) and 'teacher' (Faculty / Admin Login)
 */
function switchAuthRole(role) {
  clearFormFeedbacks();

  const studentToggle = document.getElementById('roleStudentToggle');
  const teacherToggle = document.getElementById('roleTeacherToggle');
  const studentContainer = document.getElementById('studentPortalContainer');
  const facultyContainer = document.getElementById('facultyPortalContainer');

  if (role === 'teacher') {
    if (studentToggle) studentToggle.classList.remove('active');
    if (teacherToggle) teacherToggle.classList.add('active');
    if (studentContainer) studentContainer.classList.add('hidden');
    if (facultyContainer) facultyContainer.classList.remove('hidden');
    const nameInput = document.getElementById('teacherNameInput');
    if (nameInput) nameInput.focus();
  } else {
    if (studentToggle) studentToggle.classList.add('active');
    if (teacherToggle) teacherToggle.classList.remove('active');
    if (studentContainer) studentContainer.classList.remove('hidden');
    if (facultyContainer) facultyContainer.classList.add('hidden');
    const nameInput = document.getElementById('studentRegName');
    if (nameInput) nameInput.focus();
  }
}

function clearFormFeedbacks() {
  const ids = [
    'studentRegisterFeedback',
    'teacherLoginFeedback'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.textContent = '';
    }
  });
}

// Direct Student Sign-Up & Immediate Dashboard Access
async function handleStudentSignUp(event) {
  event.preventDefault();
  clearFormFeedbacks();

  const name = document.getElementById('studentRegName').value.trim();
  const className = document.getElementById('studentRegClass').value;
  const mobile = document.getElementById('studentRegMobile').value.trim();
  const feedback = document.getElementById('studentRegisterFeedback');

  if (!name || !className || !mobile) {
    showFormError(feedback, 'Please fill in Name, Class, and Mobile Number.');
    return;
  }

  const submitBtn = document.getElementById('studentSignUpSubmitBtn') || event.target.querySelector('button[type="submit"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Unlocking Dashboard...';

  try {
    const res = await fetch('/api/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, className, mobile })
    });
    const result = await res.json();

    if (result.success) {
      // 1. Save session in persistent localStorage
      currentUser = {
        type: 'student',
        name: result.student['Student Name'],
        className: result.student['Class'],
        mobile: result.student['Mobile Number'],
        loginId: result.student['Login ID'],
        token: result.token
      };

      localStorage.setItem('momentum_user', JSON.stringify(currentUser));
      localStorage.setItem('momentum_auth_token', currentUser.token);

      showToast(`Welcome, ${currentUser.name}! You are now signed in.`, 'success');
      document.getElementById('studentSignUpForm').reset();

      // 2. Immediately redirect straight to the main dashboard
      renderDashboardScreen();
      fetchNotes();
    } else {
      showFormError(feedback, result.message || 'Registration failed.');
    }
  } catch (err) {
    showFormError(feedback, 'Server error during sign up. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// Backward-compatible alias
function handleStudentSignIn(event) {
  handleStudentSignUp(event);
}

// Teacher / Faculty Sign-in: Authenticates and opens Dashboard with Teacher Hub
async function handleTeacherSignIn(event) {
  event.preventDefault();
  clearFormFeedbacks();

  const name = (document.getElementById('teacherNameInput') ? document.getElementById('teacherNameInput').value : '').trim();
  const email = (document.getElementById('teacherEmailInput') ? document.getElementById('teacherEmailInput').value : '').trim();
  const password = (document.getElementById('teacherPasswordInput') ? document.getElementById('teacherPasswordInput').value : '');
  const feedback = document.getElementById('teacherLoginFeedback');

  if (!name || !email || !password) {
    showFormError(feedback, 'Please enter your Full Name, Username/Email, and Password.');
    return;
  }

  const submitBtn = document.getElementById('teacherSignInSubmitBtn') || event.target.querySelector('button[type="submit"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  try {
    const res = await fetch('/api/teacher/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const result = await res.json();

    if (result.success) {
      currentUser = {
        type: 'teacher',
        name: (result.teacher && result.teacher.name) ? result.teacher.name : name,
        email: (result.teacher && result.teacher.email) ? result.teacher.email : email,
        role: (result.teacher && result.teacher.role) ? result.teacher.role : 'Teacher/Admin',
        token: 'token-teach-' + Date.now()
      };

      // Save admin session in localStorage with teacher name
      localStorage.setItem('momentum_user', JSON.stringify(currentUser));
      localStorage.setItem('momentum_auth_token', currentUser.token);

      showToast(`Welcome, ${currentUser.name}! You are now signed in.`, 'success');
      document.getElementById('teacherSignInForm').reset();

      // Directly render teacher dashboard
      renderDashboardScreen();
      fetchNotes();
    } else {
      showFormError(feedback, result.message || 'Invalid administrator credentials.');
    }
  } catch (err) {
    showFormError(feedback, 'Could not authenticate. Check network connection.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

function showFormError(el, msg) {
  if (!el) return;
  el.className = 'form-feedback error';
  el.textContent = msg;
  el.classList.remove('hidden');
}

// =========================================================================
// 3. STUDY NOTES REPOSITORY & ONE-CLICK DOWNLOAD
// =========================================================================
async function fetchNotes() {
  try {
    const res = await fetch('/api/notes');
    const data = await res.json();
    if (data.success) {
      allNotes = data.notes;
      renderNotes();
      updateTotalNotesStat();
    }
  } catch (err) {
    console.error('Failed to load notes:', err);
    showToast('Could not load notes from server.', 'error');
  }
}

function renderNotes() {
  const searchTerm = (noteSearchInput ? noteSearchInput.value : '').trim().toLowerCase();
  
  const filtered = allNotes.filter(note => {
    const matchesSubject = currentSubjectFilter === 'all' || note.subject.toLowerCase() === currentSubjectFilter.toLowerCase();
    const matchesSearch = !searchTerm || 
      note.title.toLowerCase().includes(searchTerm) || 
      note.subject.toLowerCase().includes(searchTerm) || 
      (note.uploadedBy && note.uploadedBy.toLowerCase().includes(searchTerm));
    return matchesSubject && matchesSearch;
  });

  if (currentSubjectFilter === 'all') {
    activeFilterText.textContent = searchTerm 
      ? `Search results for "${searchTerm}" across all subjects` 
      : 'Showing all study materials across all 4 subjects';
  } else {
    activeFilterText.textContent = searchTerm 
      ? `Search results for "${searchTerm}" in ${currentSubjectFilter}` 
      : `Showing chapter study notes for ${currentSubjectFilter}`;
  }

  notesCountPill.textContent = `${filtered.length} Note${filtered.length === 1 ? '' : 's'} Available`;

  if (filtered.length === 0) {
    notesGrid.innerHTML = '';
    const isTotalEmpty = allNotes.length === 0;
    noNotesView.innerHTML = `
      <div class="empty-state-icon"><i class="fa-regular fa-folder-open"></i></div>
      <h4>${isTotalEmpty ? 'No Study Materials Available Yet' : 'No Notes Found for this Selection'}</h4>
      <p>
        ${isTotalEmpty 
          ? 'Educators have not published study notes yet. Newly uploaded notes and formula charts will appear here automatically in real time.' 
          : 'No notes match your current subject filter or search keyword. Try selecting another subject or resetting filters.'}
      </p>
      ${!isTotalEmpty ? '<button class="btn btn-secondary" onclick="filterBySubject(\'all\')">View All Subjects</button>' : ''}
    `;
    noNotesView.classList.remove('hidden');
    return;
  }

  noNotesView.classList.add('hidden');

  notesGrid.innerHTML = filtered.map(note => {
    const isPdf = note.fileType === 'pdf';
    const typeIcon = isPdf ? 'fa-file-pdf' : 'fa-file-image';
    const typeLabel = isPdf ? 'PDF Document' : 'Photo / Image';

    const subjectIconMap = {
      'Physics': 'fa-atom',
      'Chemistry': 'fa-flask-vial',
      'Biology': 'fa-dna',
      'Mathematics': 'fa-square-root-variable'
    };
    const subjectIcon = subjectIconMap[note.subject] || 'fa-book';

    // Teacher Delete Button
    const isTeacher = currentUser && currentUser.type === 'teacher';
    const deleteButtonHtml = isTeacher ? `
      <button class="btn-delete-note" title="Delete Note" onclick="deleteNote('${note.id}')">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    ` : '';

    return `
      <div class="note-card" data-note-id="${note.id}">
        <div>
          <div class="note-card-top">
            <span class="subject-badge ${note.subject}">
              <i class="fa-solid ${subjectIcon}"></i> ${note.subject}
            </span>
            <span class="file-type-pill">
              <i class="fa-regular ${typeIcon}"></i> ${typeLabel}
            </span>
          </div>

          <h3 class="note-title">${escapeHtml(note.title)}</h3>

          <div class="note-metadata">
            <div class="metadata-row">
              <span><i class="fa-solid fa-chalkboard-user"></i> Educator:</span>
              <strong>${escapeHtml(note.uploadedBy || 'Momentum Faculty')}</strong>
            </div>
            <div class="metadata-row">
              <span><i class="fa-solid fa-calendar-day"></i> Published:</span>
              <span>${note.uploadDate || 'Recent'}</span>
            </div>
            <div class="metadata-row">
              <span><i class="fa-solid fa-hard-drive"></i> Size:</span>
              <span>${note.fileSize || 'Standard'}</span>
            </div>
          </div>
        </div>

        <div class="note-card-actions">
          <button class="btn-download" onclick="downloadNote('${note.id}', '${escapeHtml(note.originalName || note.title)}')">
            <i class="fa-solid fa-cloud-arrow-down"></i>
            <span>One-Click Download</span>
          </button>
          ${deleteButtonHtml}
        </div>
      </div>
    `;
  }).join('');
}

// One-Click Direct Download straight to student device
function downloadNote(noteId, originalFileName) {
  const downloadUrl = `/api/notes/download/${noteId}`;
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = originalFileName || 'Momentum_Study_Note';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast(`Downloading "${originalFileName}" directly to your device!`, 'success');
}

function filterBySubject(subject) {
  currentSubjectFilter = subject;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subject') === subject);
  });
  renderNotes();
}

function filterNotes() {
  renderNotes();
}

// =========================================================================
// 4. TEACHER UPLOAD & DELETE OPERATIONS
// =========================================================================
function handleFileSelect(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('selectedFilePreview');
  const previewName = document.getElementById('selectedFileName');

  if (file) {
    previewName.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}

function resetUploadForm() {
  document.getElementById('noteUploadForm').reset();
  document.getElementById('selectedFilePreview').classList.add('hidden');
  const feedback = document.getElementById('uploadFeedback');
  feedback.classList.add('hidden');
}

async function handleNoteUpload(event) {
  event.preventDefault();
  const feedback = document.getElementById('uploadFeedback');
  feedback.classList.add('hidden');

  const title = document.getElementById('chapterTitle').value.trim();
  const subject = document.getElementById('subjectSelect').value;
  const teacherName = document.getElementById('facultyNameInput').value.trim() || (currentUser ? currentUser.name : '');
  const fileInput = document.getElementById('fileInput');

  if (!fileInput.files || fileInput.files.length === 0) {
    feedback.className = 'upload-feedback error';
    feedback.textContent = 'Please select a PDF document or image photo to upload.';
    feedback.classList.remove('hidden');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('subject', subject);
  formData.append('teacherName', teacherName);
  formData.append('noteFile', fileInput.files[0]);

  const submitBtn = document.getElementById('submitUploadBtn');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Publishing...';

  try {
    const res = await fetch('/api/teacher/upload-note', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (result.success) {
      feedback.className = 'upload-feedback success';
      feedback.textContent = 'Success! Chapter notes published to the student portal.';
      feedback.classList.remove('hidden');
      resetUploadForm();
      showToast('Chapter notes published successfully!', 'success');
      
      await fetchNotes();
      setTimeout(() => {
        switchMainTab('notes');
        filterBySubject(subject);
        scrollToNotes();
      }, 1200);
    } else {
      feedback.className = 'upload-feedback error';
      feedback.textContent = result.message || 'Upload failed.';
      feedback.classList.remove('hidden');
    }
  } catch (err) {
    feedback.className = 'upload-feedback error';
    feedback.textContent = 'Upload error. Ensure file size is below 50MB.';
    feedback.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this note from the portal?')) {
    return;
  }

  try {
    const res = await fetch(`/api/teacher/notes/${noteId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Note deleted successfully.', 'info');
      fetchNotes();
    } else {
      showToast(result.message || 'Failed to delete note.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting note.', 'error');
  }
}

// =========================================================================
// 5. ATTENDANCE SHEET, STATS & STUDENT MANAGEMENT
// =========================================================================
async function fetchStudentStats() {
  try {
    const res = await fetch('/api/teacher/student-records');
    const data = await res.json();
    if (data.success) {
      const countEl = document.getElementById('totalStudentCount');
      if (countEl) countEl.textContent = data.count;

      const badgeCountEl = document.getElementById('recordsStudentCountBadge');
      if (badgeCountEl) badgeCountEl.textContent = data.count;

      const tbody = document.getElementById('studentRecordsBody');
      if (tbody) {
        if (data.records.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No student registered yet.</td></tr>`;
        } else {
          tbody.innerHTML = data.records.map(rec => {
            const loginId = escapeHtml(rec["Login ID"] || rec["Registration ID"] || '-');
            const studentName = escapeHtml(rec["Student Name"] || '-');
            const className = escapeHtml(rec["Class"] || '-');
            const mobile = escapeHtml(rec["Mobile Number"] || '-');
            const password = escapeHtml(rec["Password"] || '-');
            const timestamp = escapeHtml(rec["Registration Timestamp (IST)"] || rec["Timestamp (IST)"] || '-');
            
            return `
              <tr>
                <td><strong><code style="color:var(--color-primary);font-size:13px;">${loginId}</code></strong></td>
                <td><strong>${studentName}</strong></td>
                <td><span class="file-type-pill">${className}</span></td>
                <td>${mobile}</td>
                <td><code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-weight:600;">${password}</code></td>
                <td><small style="color:var(--text-secondary);">${timestamp}</small></td>
                <td style="text-align: center;">
                  <button 
                    class="btn-danger-sm" 
                    title="Remove this student record" 
                    onclick="deleteStudentRecord('${loginId}', '${studentName.replace(/'/g, "\\'")}')"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

/**
 * Delete individual student record from Excel sheet and database
 */
async function deleteStudentRecord(loginId, studentName) {
  if (!confirm(`Are you sure you want to remove student "${studentName}" (${loginId}) from the Excel registry?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/teacher/students/${encodeURIComponent(loginId)}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (result.success) {
      showToast(`Student record for ${studentName} removed successfully.`, 'info');
      // Refresh UI table & counter live
      fetchStudentStats();
    } else {
      showToast(result.message || 'Failed to remove student record.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting student record.', 'error');
  }
}

/**
 * Wipe entire Excel sheet & database with double-confirmation
 */
async function confirmClearAllStudents() {
  const firstConfirm = confirm('WARNING: Are you sure you want to clear ALL registered student records from the Excel sheet and database?');
  if (!firstConfirm) return;

  const secondConfirm = confirm('Please confirm again: This will reset the entire student registry and set the student counter back to 0. Proceed?');
  if (!secondConfirm) return;

  try {
    const res = await fetch('/api/teacher/students/clear', {
      method: 'DELETE'
    });
    const result = await res.json();

    if (result.success) {
      showToast('All student records and Excel database have been cleared to zero.', 'success');
      // Refresh UI table & counters live
      fetchStudentStats();
    } else {
      showToast(result.message || 'Failed to clear student database.', 'error');
    }
  } catch (err) {
    showToast('Network error while resetting student database.', 'error');
  }
}

function exportStudentExcel() {
  window.location.href = '/api/export/students-excel';
  showToast('Downloading Student Attendance Excel Sheet (.xlsx)...', 'success');
}

function exportStudentCsv() {
  window.location.href = '/api/export/students-csv';
  showToast('Downloading Student Attendance CSV File (.csv)...', 'success');
}

function updateTotalNotesStat() {
  const el = document.getElementById('totalNotesCount');
  if (el) el.textContent = allNotes.length;
}

// =========================================================================
// 6. DASHBOARD NAVIGATION TABS
// =========================================================================
function switchMainTab(tab) {
  activeMainTab = tab;
  const notesSec = document.getElementById('notesSection');
  const uploadSec = document.getElementById('uploadSection');
  const recordsSec = document.getElementById('recordsSection');
  const searchWrapper = document.getElementById('searchWrapper');

  notesTabBtn.classList.toggle('active', tab === 'notes');
  uploadTabBtn.classList.toggle('active', tab === 'upload');
  recordsTabBtn.classList.toggle('active', tab === 'records');

  notesSec.classList.toggle('hidden', tab !== 'notes');
  uploadSec.classList.toggle('hidden', tab !== 'upload');
  recordsSec.classList.toggle('hidden', tab !== 'records');

  if (searchWrapper) {
    searchWrapper.style.visibility = tab === 'notes' ? 'visible' : 'hidden';
  }

  if (tab === 'records') {
    fetchStudentStats();
  }
}

function scrollToUploadForm() {
  switchMainTab('upload');
  document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
}

function scrollToNotes() {
  switchMainTab('notes');
  document.getElementById('notesSection').scrollIntoView({ behavior: 'smooth' });
}

// =========================================================================
// 7. TOAST NOTIFICATION UTILITY
// =========================================================================
let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMessage');

  clearTimeout(toastTimer);
  text.textContent = message;

  if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check';
    toast.style.borderLeftColor = '#10B981';
  } else if (type === 'error') {
    icon.className = 'fa-solid fa-circle-exclamation';
    toast.style.borderLeftColor = '#EF4444';
  } else {
    icon.className = 'fa-solid fa-circle-info';
    toast.style.borderLeftColor = '#F59E0B';
  }

  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
