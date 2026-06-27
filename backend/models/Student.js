import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  semesterId: {
    type: String,
    required: true,
    index: true
  },
  rollNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentName: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true,
    default: 'Alpha'
  }
}, {
  timestamps: true
});

const Student = mongoose.model('Student', studentSchema);

export default Student;
