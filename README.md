# AttendEase — Attendance Management System

AttendEase is a professional, distraction-free Attendance Management System designed for college faculty members to quickly take, search, edit, and export class attendance. It automates administrative tasks by providing PDF-to-database parsing, instant roll number copy tools, historical records management, and automated email reporting with Excel sheet attachments.

---

## Key Features

- **📊 Academic Dashboard**: High-level daily stats (total students, present/absent count), active session progress bars, and status cards.
- **📄 Advanced PDF Ingestion**: Upload institutional class lists in PDF format. The system parses them automatically, extracting `Sem ID`, `Roll Number`, `Student Name`, and `Section` columns, and deduplicates records.
- **T️ Take Attendance**: Select Date/Session (Morning vs Afternoon), search or filter students, and mark attendance with instant toggles.
- **⚡ Comma-Separated Quick Copy**: Opens a modal showing the last 3 digits of present/absent students (e.g. `001, 005, 010`) for quick copying to messaging groups.
- **✉️ Send Attendance Report**: Generate and send attendance summaries directly to custom emails (with Excel spreadsheet attachments). Add, select, and manage recipient email directories linked securely to your admin login.
- **⏳ Attendance History Drawer**: Query, inspect, edit, and bulk update saved historical records for any date/session combination.
- **📥 Excel Exports**: Download formatted worksheets (`.xlsx`) containing present/absent lists with adjusted column widths for easy reading in desktop Office tools.
- **🔒 Secure Admin Accounts**: Local email/password registration, login verification (JWT protected), and an automated 3-step OTP-based Password Reset flow.
- **⚙️ Graceful Offline Fallback**: Connects to MongoDB Atlas, with an automatic in-memory data store fallback if database connections time out.

---

## Technology Stack

- **Frontend**: React.js, Vite, Axios, Bootstrap 5, Bootstrap Icons, SheetJS (xlsx)
- **Backend**: Node.js, Express.js (ES Modules), Mongoose, Multer (file upload), Nodemailer
- **Database**: MongoDB Atlas (Primary) / In-Memory Fallback Store (Secondary)
- **Parsing Engine**: `pdfjs-dist` (Legacy PDF build for coordinate-based row reconstruction)

---

## Directory Structure

```
├── backend/
│   ├── config/          # DB connection configuration
│   ├── controllers/     # Route handler functions (Auth, Students, Attendance)
│   ├── middleware/      # JWT Route protection & validation
│   ├── models/          # MongoDB / Mongoose Schemas (User, Student, Attendance)
│   ├── routes/          # REST Endpoint mappings
│   └── utils/           # PDF parser & Excel exporter utilities
├── frontend/
│   ├── src/
│   │   ├── components/  # Layout units (Navbar, Sidebar)
│   │   ├── context/     # State providers (AuthContext, AttendanceContext)
│   │   ├── pages/       # Page views (Dashboard, History, TakeAttendance, SendReport)
│   │   └── styles/      # CSS variables & typography tokens
```
