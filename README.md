# Momentum Coaching Classes - Study Notes Portal

A full-stack, responsive web application for **"Momentum Coaching Classes"** study notes repository, tailored for secondary and higher secondary students (Physics, Chemistry, Biology, and Mathematics).

---

## 🌟 Key Highlights & Design Standards

### 1. Typography & Spacious "Khula-Khula" Layout
- **Strictly Medium-Sized Typography**: Balanced font scale using *Plus Jakarta Sans* (`15px` root, `18px-22px` headings) without cramped or oversized texts.
- **Spacious & Airy ("Khula-Khula")**: Generous padding (`28px-34px`), wide grid gaps (`28px`), comfortable line heights (`1.65`), and clear separation between cards and sections.
- **Strict Light Mode**: Off-white/white background (`#F8F9FA` / `#FFFFFF`) paired with dark slate typography and rich institute branding: **Deep Navy Blue** (`#0F2537`, `#1E3A8A`) and **Royal Gold** (`#D97706`, `#B45309`).

### 2. Branding & Institute Information
- **Header**: Prominent "MOMENTUM Coaching Classes" logo emblem with gold orbit badge.
- **Footer Official Details**:
  - **Address**: Goregaon, PIN 441801
  - **Contact Helplines**: `+91 88066 91259`, `+91 98817 14171`, `+91 91684 42150`
  - **Tagline**: *"Learn Today, Lead Tomorrow."*
  - **Timings**: Monday – Saturday: 8:00 AM – 7:30 PM

---

## 👥 Authentication & Roles

### 🎓 Student Access
- **Fields**: Name, Class, and 10-digit Mobile Number.
- **Automatic Excel Sheet Logging**: Every student sign-in is instantly committed to:
  - `data/student_signins.xlsx` (Microsoft Excel workbook)
  - `data/student_signins.csv` (Universal comma-separated format)
  - Captures: `Registration ID`, `Student Name`, `Class`, `Mobile Number`, `Timestamp (IST)`, and `Date`.

### 👩‍🏫 Teacher (Admin) Access
- **Fields**: Name (optional), Faculty Email, and Password (`admin` or `momentum`).
- **Unlocks**:
  - **Teacher Control Panel**: Real-time stats on published notes and signed-in students.
  - **Upload Chapter Notes**: Form with Chapter Title, Subject selector (Physics, Chemistry, Biology, Mathematics), Educator name, and Drag-and-drop file upload (supports both **PDF** and **Images / Photos**).
  - **Student Attendance Sheet Tab**: Live browser table with one-click **Export Excel (.xlsx)** and **Download CSV**.
  - **Management**: Ability to delete or manage published notes.

---

## ⚡ Core Features
1. **Subject-Wise Filtration**: Tabs for **Physics**, **Chemistry**, **Biology**, and **Mathematics**.
2. **Instant Search**: Real-time search across chapters, topics, and faculty names.
3. **One-Click Direct Download**: Direct file attachment headers (`Content-Disposition`) trigger instant saving to student's mobile gallery or computer file manager.

---

## 🚀 How to Run

1. Open your terminal in this project directory:
   ```bash
   cd "d:\coaching website"
   ```
2. Start the server:
   ```bash
   node server.js
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```
