import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { isMongoConnected } from '../config/db.js';
import { studentsDb, attendanceDb } from './inMemoryDb.js';
import xlsx from 'xlsx';
import { sendEmail } from '../utils/emailService.js';

// Helper function to sort attendance records by Student's Semester ID, then Roll Number
const sortRecordsBySemesterId = (records) => {
  return records.sort((a, b) => {
    const studentA = a.studentId || {};
    const studentB = b.studentId || {};
    
    const semA = studentA.semesterId || '';
    const semB = studentB.semesterId || '';
    const semCompare = semA.localeCompare(semB, undefined, { numeric: true, sensitivity: 'base' });
    if (semCompare !== 0) return semCompare;

    const rollA = studentA.rollNo || '';
    const rollB = studentB.rollNo || '';
    return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// @desc    Save/record attendance for a session
// @route   POST /api/attendance
// @access  Public
export const saveAttendance = async (req, res) => {
  try {
    const { date, session, records, overwrite } = req.body;

    if (!date || !session || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid data. Date, session, and records are required.' });
    }

    if (!isMongoConnected) {
      // In-Memory Implementation
      const existingRecords = attendanceDb.filter((r) => r.date === date && r.session === session);

      if (existingRecords.length > 0 && !overwrite) {
        return res.status(409).json({
          success: false,
          message: `Attendance has already been recorded for ${date} (${session} session) [In-Memory Mode]. Do you want to overwrite?`,
          requiresConfirmation: true
        });
      }

      // Overwrite if requested
      if (existingRecords.length > 0 && overwrite) {
        for (let i = attendanceDb.length - 1; i >= 0; i--) {
          if (attendanceDb[i].date === date && attendanceDb[i].session === session) {
            attendanceDb.splice(i, 1);
          }
        }
      }

      // Add new records
      const savedDocs = [];
      records.forEach((r) => {
        const doc = {
          _id: `mem_att_${Math.random().toString(36).substr(2, 9)}`,
          date,
          session,
          studentId: r.studentId,
          status: r.status,
          timestamp: new Date().toISOString()
        };
        attendanceDb.push(doc);
        savedDocs.push(doc);
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance saved successfully [In-Memory].',
        count: savedDocs.length
      });
    }

    // MongoDB Implementation
    const existingCount = await Attendance.countDocuments({ date, session });

    if (existingCount > 0 && !overwrite) {
      return res.status(409).json({
        success: false,
        message: `Attendance has already been recorded for ${date} (${session} session). Do you want to overwrite?`,
        requiresConfirmation: true
      });
    }

    if (existingCount > 0 && overwrite) {
      await Attendance.deleteMany({ date, session });
    }

    const attendanceDocs = records.map((r) => ({
      date,
      session,
      studentId: r.studentId,
      status: r.status
    }));

    const savedRecords = await Attendance.insertMany(attendanceDocs);

    return res.status(200).json({
      success: true,
      message: 'Attendance saved successfully.',
      count: savedRecords.length
    });
  } catch (error) {
    console.error('Save Attendance Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance records (with filters)
// @route   GET /api/attendance
// @access  Public
export const getAttendance = async (req, res) => {
  try {
    const { date, session, studentId } = req.query;

    if (!isMongoConnected) {
      // In-Memory Implementation
      let filtered = [...attendanceDb];
      if (date) filtered = filtered.filter((r) => r.date === date);
      if (session) filtered = filtered.filter((r) => r.session === session);
      if (studentId) filtered = filtered.filter((r) => r.studentId === studentId);

      const populated = filtered.map((r) => {
        const student = studentsDb.find((s) => s._id === r.studentId) || null;
        return { ...r, studentId: student };
      });

      return res.status(200).json({ success: true, data: populated });
    }

    // MongoDB Implementation
    const filter = {};
    if (date) filter.date = date;
    if (session) filter.session = session;
    if (studentId) filter.studentId = studentId;

    const records = await Attendance.find(filter)
      .populate('studentId')
      .sort({ timestamp: -1 });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('Get Attendance Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance for a specific date
// @route   GET /api/attendance/date/:date
// @access  Public
export const getAttendanceByDate = async (req, res) => {
  try {
    if (!isMongoConnected) {
      // In-Memory Implementation
      const filtered = attendanceDb.filter((r) => r.date === req.params.date);
      const populated = filtered.map((r) => {
        const student = studentsDb.find((s) => s._id === r.studentId) || null;
        return { ...r, studentId: student };
      });
      return res.status(200).json({ success: true, data: populated });
    }

    // MongoDB Implementation
    const records = await Attendance.find({ date: req.params.date })
      .populate('studentId')
      .sort({ session: 1 });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('Get Attendance by Date Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance for a specific date and session
// @route   GET /api/attendance/date/:date/session/:session
// @access  Public
export const getAttendanceByDateSession = async (req, res) => {
  try {
    const { date, session } = req.params;

    if (!isMongoConnected) {
      // In-Memory Implementation
      const filtered = attendanceDb.filter((r) => r.date === date && r.session === session);
      const populated = filtered.map((r) => {
        const student = studentsDb.find((s) => s._id === r.studentId) || null;
        return { ...r, studentId: student };
      });
      sortRecordsBySemesterId(populated);
      return res.status(200).json({ success: true, data: populated });
    }

    // MongoDB Implementation
    const records = await Attendance.find({ date, session }).populate('studentId');
    sortRecordsBySemesterId(records);
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('Get Attendance by Date/Session Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update single attendance record
// @route   PUT /api/attendance/:id
// @access  Public
export const updateAttendance = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Present or Absent.' });
    }

    if (!isMongoConnected) {
      // In-Memory Implementation
      const index = attendanceDb.findIndex((r) => r._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Attendance record not found.' });
      }

      attendanceDb[index].status = status;
      attendanceDb[index].timestamp = new Date().toISOString();

      const record = attendanceDb[index];
      const student = studentsDb.find((s) => s._id === record.studentId) || null;

      return res.status(200).json({
        success: true,
        data: { ...record, studentId: student }
      });
    }

    // MongoDB Implementation
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    record.status = status;
    await record.save();

    const updatedRecord = await Attendance.findById(req.params.id).populate('studentId');
    return res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error('Update Attendance Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single attendance record
// @route   DELETE /api/attendance/:id
// @access  Public
export const deleteAttendance = async (req, res) => {
  try {
    if (!isMongoConnected) {
      // In-Memory Implementation
      const index = attendanceDb.findIndex((r) => r._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Attendance record not found.' });
      }
      attendanceDb.splice(index, 1);
      return res.status(200).json({ success: true, message: 'Attendance record deleted successfully.' });
    }

    // MongoDB Implementation
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    await Attendance.deleteOne({ _id: req.params.id });
    return res.status(200).json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error) {
    console.error('Delete Attendance Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to handle Excel generation
const generateExcelFile = async (req, res, targetStatus) => {
  try {
    const { date, session } = req.query;

    if (!date || !session) {
      return res.status(400).json({ success: false, message: 'Date and session are required query parameters.' });
    }

    let records = [];
    if (isMongoConnected) {
      records = await Attendance.find({ date, session, status: targetStatus }).populate('studentId');
    } else {
      const filtered = attendanceDb.filter(
        (r) => r.date === date && r.session === session && r.status === targetStatus
      );
      records = filtered.map((r) => {
        const student = studentsDb.find((s) => s._id === r.studentId) || {};
        return {
          ...r,
          studentId: student
        };
      });
    }
    sortRecordsBySemesterId(records);
    if (records.length === 0) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Export Failed - AttendEase</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body { background-color: #faf8ff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { max-width: 500px; padding: 2rem; border-radius: 12px; border: none; box-shadow: 0 8px 30px rgba(0,0,0,0.05); background: white; text-align: center; }
            .icon { font-size: 3rem; color: #dc3545; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⚠️</div>
            <h4 class="fw-bold mb-2">No Attendance Data Found</h4>
            <p class="text-muted">There are no students marked as <strong>${targetStatus}</strong> for date <strong>${date}</strong> (${session} session) in the system.</p>
            <p class="fs-7 text-secondary mb-4">Please make sure attendance has been taken and saved first.</p>
            <button onclick="window.close()" class="btn btn-primary px-4" style="background-color: #0057cd; border-color: #0057cd;">Close Tab</button>
          </div>
        </body>
        </html>
      `);
    }


    const rows = records.map((r) => {
      const student = r.studentId || {};
      return {
        'Semester ID': student.semesterId || 'N/A',
        'Roll No': student.rollNo || 'N/A',
        'Student Name': student.studentName || 'N/A',
        'Section': student.section || 'Alpha',
        'Session': r.session,
        'Date': r.date,
        'Status': r.status
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, targetStatus);

    const max_len = [15, 15, 30, 12, 12, 15, 12];
    worksheet['!cols'] = max_len.map((w) => ({ wch: w }));

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${targetStatus}Students_${date}_${session}.xlsx`);
    return res.send(buffer);
  } catch (error) {
    console.error(`Export ${targetStatus} Error:`, error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Present students for a session to Excel
// @route   GET /api/attendance/export/present
// @access  Public
export const exportPresent = async (req, res) => {
  await generateExcelFile(req, res, 'Present');
};

// @desc    Export Absent students for a session to Excel
// @route   GET /api/attendance/export/absent
// @access  Public
export const exportAbsent = async (req, res) => {
  await generateExcelFile(req, res, 'Absent');
};

// @desc    Send attendance report email with xlsx attachment
// @route   POST /api/attendance/send-report
// @access  Private
export const sendAttendanceReport = async (req, res) => {
  try {
    const { date, session, status, emails, section } = req.body;

    if (!date || !session || !status || !emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'Date, session, status (Present or Absent), and at least one recipient email are required.' });
    }

    let records = [];
    if (isMongoConnected) {
      records = await Attendance.find({ date, session, status }).populate('studentId');
    } else {
      const filtered = attendanceDb.filter(
        (r) => r.date === date && r.session === session && r.status === status
      );
      records = filtered.map((r) => {
        const student = studentsDb.find((s) => s._id === r.studentId) || {};
        return {
          ...r,
          studentId: student
        };
      });
    }
    sortRecordsBySemesterId(records);

    // Filter by section if specified (excluding 'All')
    if (section && section !== 'All') {
      records = records.filter(
        (r) => r.studentId && r.studentId.section === section
      );
    }

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: `No student records found with status '${status}'${section && section !== 'All' ? ` in Section '${section}'` : ''} for date ${date} (${session} session).` });
    }

    // 1. Prepare XLSX Buffer
    const rows = records.map((r) => {
      const student = r.studentId || {};
      return {
        'Semester ID': student.semesterId || 'N/A',
        'Roll No': student.rollNo || 'N/A',
        'Student Name': student.studentName || 'N/A',
        'Section': student.section || 'Alpha',
        'Session': r.session,
        'Date': r.date,
        'Status': r.status
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, status);

    const max_len = [15, 15, 30, 12, 12, 15, 12];
    worksheet['!cols'] = max_len.map((w) => ({ wch: w }));

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 2. Prepare 3-digit roll numbers list
    const threeDigitRolls = records
      .map(r => r.studentId && r.studentId.rollNo ? r.studentId.rollNo.slice(-3) : '')
      .filter(Boolean)
      .join(', ');

    // 3. Prepare email HTML formatting
    const sectionDisplay = section && section !== 'All' ? section : 'All Sections';
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1a202c;">
        <div style="background: ${status === 'Present' ? '#10b981' : '#ef4444'}; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">🗒️ AttendEase Report</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${status} Students Report for ${date} (${session} Session)</p>
        </div>
        <div style="padding: 24px; background-color: #f8fafc;">
          <h4 style="margin-top: 0; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Session Summary</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600; width: 120px;">Date:</td>
              <td style="padding: 6px 0;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; width: 120px;">Section:</td>
              <td style="padding: 6px 0;">${sectionDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Session:</td>
              <td style="padding: 6px 0;">${session} Session</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Category:</td>
              <td style="padding: 6px 0;"><span style="background-color: ${status === 'Present' ? '#d1fae5' : '#fee2e2'}; color: ${status === 'Present' ? '#065f46' : '#991b1b'}; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600;">${status} (${records.length} students)</span></td>
            </tr>
          </table>

          <h4 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">Roll Numbers (Last 3 Digits)</h4>
          <div style="background-color: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 14px; word-break: break-all; color: #334155; margin-bottom: 20px;">
            ${threeDigitRolls || 'None'}
          </div>

          <p style="color: #64748b; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            This report was auto-generated by AttendEase. Please find the corresponding Excel sheet attached containing the full student details list.
          </p>
        </div>
      </div>
    `;

    // 4. Send Email via unified emailService (supports Resend or SMTP with timeouts)
    await sendEmail({
      fromDisplayName: 'AttendEase Report',
      to: emails,
      subject: `AttendEase ${status} Report — ${date} (${session})`,
      html: emailHtml,
      attachments: [
        {
          filename: `${status}Students_${date}_${session}.xlsx`,
          content: buffer
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Attendance report successfully sent to ${emails.length} recipient(s).`
    });

  } catch (error) {
    console.error('Send Report Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send attendance report email.' });
  }
};
