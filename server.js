const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Static files
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// File Paths
const EXCEL_FILE = path.join(DATA_DIR, 'student_signins.xlsx');
const CSV_FILE = path.join(DATA_DIR, 'student_signins.csv');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// Initialize empty notes repository if none exists (No mock / dummy data)
if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
}


// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents and image files (JPG, PNG, WEBP) are allowed.'));
    }
  }
});

const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

// Initialize empty students repository if none exists
if (!fs.existsSync(STUDENTS_FILE)) {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2));
}

// Generate unique sequential or random student credentials
function generateStudentCredentials() {
  let students = [];
  try {
    if (fs.existsSync(STUDENTS_FILE)) {
      students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
    }
  } catch (e) {
    students = [];
  }

  const nextSeq = String(students.length + 1).padStart(3, '0');
  const loginId = `MOM2026${nextSeq}`;
  
  // 6-digit secure numeric/alphanumeric PIN password
  const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }

  return { loginId, password };
}

// Helper: Excel & CSV write for students with strict duplicate check
function saveOrFindStudent({ name, className, mobile }) {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const cleanClass = className.trim().replace(/\s+/g, ' ');
  const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10); // Standardize to 10-digit number

  // 1. Load registered students JSON
  let students = [];
  if (fs.existsSync(STUDENTS_FILE)) {
    try {
      students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
    } catch (e) {
      students = [];
    }
  }

  // 2. Load Excel records to cross-verify duplicates
  let excelRecords = [];
  if (fs.existsSync(EXCEL_FILE)) {
    try {
      const workbook = XLSX.readFile(EXCEL_FILE);
      const sheetName = workbook.SheetNames[0];
      excelRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } catch (err) {
      excelRecords = [];
    }
  }

  // Helper matching function
  const isMatch = (candName, candMobile, candClass) => {
    const n = String(candName || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const m = String(candMobile || '').replace(/[^0-9]/g, '').slice(-10);
    const c = String(candClass || '').trim().replace(/\s+/g, ' ').toLowerCase();
    return n === cleanName.toLowerCase() && m === cleanMobile && c === cleanClass.toLowerCase();
  };

  // Check duplicate in students.json
  const existingJsonStudent = students.find(s => isMatch(s.name, s.mobile, s.className));

  // Check duplicate in excelRecords
  const existingExcelStudent = excelRecords.find(row => 
    isMatch(row['Student Name'], row['Mobile Number'], row['Class'])
  );

  const now = new Date();
  const timestamp = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // STRICT DUPLICATE PREVENTION:
  // If record exists in either JSON or Excel, do NOT add a new row to Excel or JSON!
  if (existingJsonStudent || existingExcelStudent) {
    const matched = existingJsonStudent || {
      loginId: existingExcelStudent['Login ID'] || generateStudentCredentials().loginId,
      name: existingExcelStudent['Student Name'] || cleanName,
      className: existingExcelStudent['Class'] || cleanClass,
      mobile: existingExcelStudent['Mobile Number'] || cleanMobile,
      password: existingExcelStudent['Password'] || 'PASS',
      timestamp: existingExcelStudent['Registration Timestamp (IST)'] || timestamp,
      date: existingExcelStudent['Date'] || now.toISOString().split('T')[0]
    };

    // If missing in JSON but present in Excel, ensure JSON is synchronized
    if (!existingJsonStudent && existingExcelStudent) {
      students.push({
        loginId: matched.loginId,
        password: matched.password,
        name: cleanName,
        className: cleanClass,
        mobile: cleanMobile,
        timestamp: matched.timestamp,
        date: matched.date
      });
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));
    }

    return {
      isNew: false,
      student: {
        "Login ID": matched.loginId,
        "Student Name": matched.name,
        "Class": matched.className,
        "Mobile Number": matched.mobile,
        "Password": matched.password,
        "Timestamp (IST)": matched.timestamp || timestamp,
        "Date": matched.date || now.toISOString().split('T')[0]
      }
    };
  }

  // NOT A DUPLICATE: Generate unique ID and Password
  const { loginId, password } = generateStudentCredentials();

  const studentObj = {
    loginId,
    password,
    name: cleanName,
    className: cleanClass,
    mobile: cleanMobile,
    timestamp,
    date: now.toISOString().split('T')[0]
  };

  students.push(studentObj);
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));

  // Append new row to Excel and CSV
  const excelRow = {
    "Login ID": loginId,
    "Student Name": cleanName,
    "Class": cleanClass,
    "Mobile Number": cleanMobile,
    "Password": password,
    "Registration Timestamp (IST)": timestamp,
    "Date": now.toISOString().split('T')[0]
  };

  excelRecords.push(excelRow);

  const newWorksheet = XLSX.utils.json_to_sheet(excelRecords);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Students_Registry');
  XLSX.writeFile(newWorkbook, EXCEL_FILE);

  const csvData = XLSX.utils.sheet_to_csv(newWorksheet);
  fs.writeFileSync(CSV_FILE, csvData, 'utf-8');

  return {
    isNew: true,
    student: {
      "Login ID": loginId,
      "Student Name": cleanName,
      "Class": cleanClass,
      "Mobile Number": cleanMobile,
      "Password": password,
      "Timestamp (IST)": timestamp,
      "Date": now.toISOString().split('T')[0]
    }
  };
}

// ----------------- API ROUTES -----------------

// 1. Student First-Time Registration API
app.post('/api/student/register', (req, res) => {
  const { name, className, mobile } = req.body;

  if (!name || !className || !mobile) {
    return res.status(400).json({ success: false, message: 'Name, Class, and Mobile Number are required.' });
  }

  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length < 10) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
  }

  try {
    const result = saveOrFindStudent({ name, className, mobile: cleanMobile });
    res.json({
      success: true,
      isNew: result.isNew,
      message: result.isNew 
        ? 'Registration successful! Please save your unique Login ID and Password.' 
        : 'Welcome back! Existing student record found.',
      student: result.student,
      token: 'token-stu-' + Date.now() + '-' + result.student['Login ID']
    });
  } catch (err) {
    console.error('Registration save error:', err);
    res.status(500).json({ success: false, message: 'Failed to process student registration.' });
  }
});

// 2. Student Secure Login via Login ID and Password
app.post('/api/student/login', (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ success: false, message: 'Login ID and Password are required.' });
  }

  const cleanId = loginId.trim().toUpperCase();
  const cleanPass = password.trim();

  let students = [];
  if (fs.existsSync(STUDENTS_FILE)) {
    try {
      students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
    } catch (e) {
      students = [];
    }
  }

  const matched = students.find(s => 
    s.loginId.toUpperCase() === cleanId && s.password === cleanPass
  );

  if (matched) {
    res.json({
      success: true,
      message: 'Student authenticated successfully.',
      student: {
        "Login ID": matched.loginId,
        "Student Name": matched.name,
        "Class": matched.className,
        "Mobile Number": matched.mobile,
        "Timestamp (IST)": matched.timestamp
      },
      token: 'token-stu-' + Date.now() + '-' + matched.loginId
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid Login ID or Password. Please double-check your credentials or register.' 
    });
  }
});

// Backward compatibility alias for /api/student/signin
app.post('/api/student/signin', (req, res) => {
  const { name, className, mobile } = req.body;
  if (!name || !className || !mobile) {
    return res.status(400).json({ success: false, message: 'Name, Class, and Mobile Number are required.' });
  }
  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  try {
    const result = saveOrFindStudent({ name, className, mobile: cleanMobile });
    res.json({
      success: true,
      isNew: result.isNew,
      message: 'Logged in successfully.',
      student: result.student,
      token: 'token-stu-' + Date.now() + '-' + result.student['Login ID']
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process sign-in.' });
  }
});

// 2. Teacher (Admin) Sign-in API
// Default registered teachers with credentials
const TEACHERS = [
  { name: 'Director / Lead Faculty', email: 'admin@momentum.edu', password: 'admin' },
  { name: 'Prof. Sharma (Physics)', email: 'physics@momentum.edu', password: 'admin' },
  { name: 'Dr. Deshmukh (Chemistry)', email: 'chemistry@momentum.edu', password: 'admin' },
  { name: 'Mrs. Kulkarni (Biology)', email: 'biology@momentum.edu', password: 'admin' },
  { name: 'Er. Verma (Mathematics)', email: 'maths@momentum.edu', password: 'admin' }
];

app.post('/api/teacher/signin', (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Faculty ID/Email and password are required.' });
  }

  const normalizedInput = email.trim().toLowerCase();
  const matched = TEACHERS.find(t => 
    (t.email.toLowerCase() === normalizedInput || t.email.split('@')[0].toLowerCase() === normalizedInput) && 
    t.password === password
  );

  if (matched) {
    return res.json({
      success: true,
      message: 'Faculty authenticated successfully.',
      teacher: {
        name: name && name.trim() ? name.trim() : matched.name,
        email: matched.email,
        role: 'Teacher/Admin'
      }
    });
  } else {
    // Convenience fallback: standard faculty password 'momentum' or 'admin'
    if (password === 'momentum' || password === 'admin' || password === '123456') {
      return res.json({
        success: true,
        message: 'Faculty authenticated successfully.',
        teacher: {
          name: name && name.trim() ? name.trim() : (normalizedInput === 'admin' ? 'Administrator' : 'Faculty Member'),
          email: normalizedInput.includes('@') ? normalizedInput : `${normalizedInput}@momentum.edu`,
          role: 'Teacher/Admin'
        }
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid faculty credentials. Check Faculty ID and password.' });
  }
});

// 3. Get all notes
app.get('/api/notes', (req, res) => {
  try {
    if (!fs.existsSync(NOTES_FILE)) {
      return res.json({ success: true, notes: [] });
    }
    const raw = fs.readFileSync(NOTES_FILE, 'utf-8');
    const notes = JSON.parse(raw);
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve notes.' });
  }
});

// 4. Teacher Upload Note API
app.post('/api/teacher/upload-note', upload.single('noteFile'), (req, res) => {
  try {
    const { title, subject, teacherName } = req.body;
    const file = req.file;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Chapter title/name is required.' });
    }
    if (!subject || !['Physics', 'Chemistry', 'Biology', 'Mathematics'].includes(subject)) {
      return res.status(400).json({ success: false, message: 'Please select a valid subject (Physics, Chemistry, Biology, Mathematics).' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Please attach a PDF document or image file.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = ext === '.pdf';
    const fileSizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const newNote = {
      id: 'note-' + Date.now(),
      title: title.trim(),
      subject: subject,
      filename: file.filename,
      originalName: file.originalname,
      fileType: isPdf ? 'pdf' : 'image',
      fileSize: fileSizeFormatted,
      uploadedBy: teacherName ? teacherName.trim() : 'Faculty Member',
      uploadDate: new Date().toISOString().split('T')[0],
      views: 0
    };

    let notes = [];
    if (fs.existsSync(NOTES_FILE)) {
      notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    }
    // Prepend so latest notes show first
    notes.unshift(newNote);
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

    res.json({
      success: true,
      message: 'Notes published successfully!',
      note: newNote
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'File upload failed.' });
  }
});

// 5. Delete note (Teacher only)
app.delete('/api/teacher/notes/:id', (req, res) => {
  try {
    const noteId = req.params.id;
    if (!fs.existsSync(NOTES_FILE)) {
      return res.status(404).json({ success: false, message: 'Notes database empty.' });
    }

    let notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    const target = notes.find(n => n.id === noteId);

    if (!target) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    // Attempt deleting file from disk
    const filePath = path.join(UPLOADS_DIR, target.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not unlink:', e); }
    }

    notes = notes.filter(n => n.id !== noteId);
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

    res.json({ success: true, message: 'Note deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete note.' });
  }
});

// 6. Download Note with force-download headers and original filename
app.get('/api/notes/download/:id', (req, res) => {
  try {
    if (!fs.existsSync(NOTES_FILE)) {
      return res.status(404).send('Notes repository not found.');
    }
    const notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    const note = notes.find(n => n.id === req.params.id);

    if (!note) {
      return res.status(404).send('Note not found.');
    }

    const filePath = path.join(UPLOADS_DIR, note.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('The requested note file is not found on the server.');
    }

    // Increment download/view counter
    note.views = (note.views || 0) + 1;
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

    res.download(filePath, note.originalName || note.filename);
  } catch (err) {
    res.status(500).send('Download error occurred.');
  }
});

// 7. Download Student Records Sheet (.xlsx or .csv)
app.get('/api/export/students-excel', (req, res) => {
  if (fs.existsSync(EXCEL_FILE)) {
    res.download(EXCEL_FILE, 'Momentum_Students_Attendance.xlsx');
  } else {
    // Generate empty or minimal sheet
    const ws = XLSX.utils.json_to_sheet([{ "Note": "No student sign-ins yet" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const tempPath = path.join(DATA_DIR, 'Momentum_Students_Attendance.xlsx');
    XLSX.writeFile(wb, tempPath);
    res.download(tempPath, 'Momentum_Students_Attendance.xlsx');
  }
});

app.get('/api/export/students-csv', (req, res) => {
  if (fs.existsSync(CSV_FILE)) {
    res.download(CSV_FILE, 'Momentum_Students_Attendance.csv');
  } else {
    res.header('Content-Type', 'text/csv');
    res.attachment('Momentum_Students_Attendance.csv');
    res.send('"Registration ID","Student Name","Class","Mobile Number","Timestamp (IST)","Date"\n');
  }
});

// 8. Get student count & student list for Teacher dashboard
app.get('/api/teacher/student-records', (req, res) => {
  try {
    let records = [];
    if (fs.existsSync(EXCEL_FILE)) {
      const workbook = XLSX.readFile(EXCEL_FILE);
      const sheetName = workbook.SheetNames[0];
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (fs.existsSync(STUDENTS_FILE)) {
      const jsonStudents = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      records = jsonStudents.map(s => ({
        "Login ID": s.loginId,
        "Student Name": s.name,
        "Class": s.className,
        "Mobile Number": s.mobile,
        "Password": s.password,
        "Registration Timestamp (IST)": s.timestamp,
        "Date": s.date
      }));
    }
    // Return in reverse order (latest registrations on top)
    res.json({ success: true, count: records.length, records: [...records].reverse() });
  } catch (err) {
    console.error('Fetch student records error:', err);
    res.json({ success: true, count: 0, records: [] });
  }
});

// 9. Clear All Student Records (Excel + CSV + JSON database)
app.delete('/api/teacher/students/clear', (req, res) => {
  try {
    // 1. Reset students.json
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), 'utf-8');

    // 2. Reset student_signins.xlsx with fresh headers
    const headers = [
      'Login ID',
      'Student Name',
      'Class',
      'Mobile Number',
      'Password',
      'Registration Timestamp (IST)',
      'Date'
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Registry');
    XLSX.writeFile(wb, EXCEL_FILE);

    // 3. Reset student_signins.csv
    const csvHeader = headers.map(h => `"${h}"`).join(',') + '\n';
    fs.writeFileSync(CSV_FILE, csvHeader, 'utf-8');

    res.json({ success: true, message: 'All student records and Excel database have been successfully cleared.' });
  } catch (err) {
    console.error('Clear database error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset student database.' });
  }
});

// 10. Delete Individual Student Record by Login ID
app.delete('/api/teacher/students/:loginId', (req, res) => {
  try {
    const targetId = req.params.loginId.trim().toUpperCase();

    // 1. Update students.json
    let students = [];
    if (fs.existsSync(STUDENTS_FILE)) {
      students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      students = students.filter(s => (s.loginId || '').toUpperCase() !== targetId);
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf-8');
    }

    // 2. Update Excel sheet
    let excelRecords = [];
    if (fs.existsSync(EXCEL_FILE)) {
      const workbook = XLSX.readFile(EXCEL_FILE);
      const sheetName = workbook.SheetNames[0];
      excelRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      excelRecords = excelRecords.filter(row => 
        String(row['Login ID'] || row['Registration ID'] || '').trim().toUpperCase() !== targetId
      );

      const newWs = XLSX.utils.json_to_sheet(excelRecords);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, newWs, 'Students_Registry');
      XLSX.writeFile(newWb, EXCEL_FILE);

      const csvData = XLSX.utils.sheet_to_csv(newWs);
      fs.writeFileSync(CSV_FILE, csvData, 'utf-8');
    }

    res.json({ success: true, message: `Student ${targetId} removed successfully.` });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete student record.' });
  }
});

// Fallback to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Momentum Coaching Classes Study Notes Portal Running `);
    console.log(` Local Server: http://localhost:${PORT} `);
    console.log(`=======================================================`);
  });
}

module.exports = app;
