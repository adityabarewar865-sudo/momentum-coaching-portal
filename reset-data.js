const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dataDir = path.join(__dirname, 'data');

// 1. Reset students.json
fs.writeFileSync(path.join(dataDir, 'students.json'), JSON.stringify([], null, 2), 'utf-8');

// 2. Reset student_signins.xlsx
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
XLSX.writeFile(wb, path.join(dataDir, 'student_signins.xlsx'));

// 3. Reset student_signins.csv
const csvHeader = headers.map(h => `"${h}"`).join(',') + '\n';
fs.writeFileSync(path.join(dataDir, 'student_signins.csv'), csvHeader, 'utf-8');

console.log('RESET_COMPLETE: All student records and Excel/CSV sheets have been reset fresh.');
