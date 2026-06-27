import express from 'express';
import {
  saveAttendance,
  getAttendance,
  getAttendanceByDate,
  getAttendanceByDateSession,
  updateAttendance,
  deleteAttendance,
  exportPresent,
  exportAbsent,
  sendAttendanceReport
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bulk record attendance & query routes
router.post('/', protect, saveAttendance);
router.get('/', protect, getAttendance);

// Send report email route
router.post('/send-report', protect, sendAttendanceReport);

// Specific date/session queries
router.get('/date/:date', protect, getAttendanceByDate);
router.get('/date/:date/session/:session', protect, getAttendanceByDateSession);

// Individual attendance CRUD
router.put('/:id', protect, updateAttendance);
router.delete('/:id', protect, deleteAttendance);

// Export utilities
router.get('/export/present', protect, exportPresent);
router.get('/export/absent', protect, exportAbsent);

export default router;
