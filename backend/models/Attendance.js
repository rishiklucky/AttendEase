import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  session: {
    type: String,
    required: true,
    enum: ['Morning', 'Afternoon']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Present', 'Absent']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index to prevent duplicate entries for a single student on a specific date/session
attendanceSchema.index({ date: 1, session: 1, studentId: 1 }, { unique: true });

// Compound index for date + session for faster querying of session attendance
attendanceSchema.index({ date: 1, session: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
