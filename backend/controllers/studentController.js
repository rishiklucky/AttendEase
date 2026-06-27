import Student from '../models/Student.js';
import { parseStudentPDF } from '../utils/pdfParser.js';
import { isMongoConnected } from '../config/db.js';
import { studentsDb, attendanceDb } from './inMemoryDb.js';

// @desc    Upload PDF and parse/save students
// @route   POST /api/students/upload-pdf
// @access  Public
export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file.' });
    }

    const students = await parseStudentPDF(req.file.buffer);
    
    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No student records found in the PDF. Please check its layout.' });
    }

    let addedCount = 0;
    let updatedCount = 0;

    if (!isMongoConnected) {
      // In-Memory implementation
      for (const s of students) {
        const existingStudentIndex = studentsDb.findIndex((x) => x.rollNo === s.rollNo);
        
        if (existingStudentIndex !== -1) {
          const existing = studentsDb[existingStudentIndex];
          if (
            existing.studentName !== s.studentName ||
            existing.semesterId !== s.semesterId ||
            existing.section !== s.section
          ) {
            studentsDb[existingStudentIndex] = {
              ...existing,
              studentName: s.studentName,
              semesterId: s.semesterId,
              section: s.section,
              updatedAt: new Date().toISOString()
            };
            updatedCount++;
          }
        } else {
          const newStudent = {
            _id: `mem_stud_${Math.random().toString(36).substr(2, 9)}`,
            semesterId: s.semesterId,
            rollNo: s.rollNo,
            studentName: s.studentName,
            section: s.section,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          studentsDb.push(newStudent);
          addedCount++;
        }
      }
    } else {
      // MongoDB Implementation
      for (const s of students) {
        const existingStudent = await Student.findOne({ rollNo: s.rollNo });
        
        if (existingStudent) {
          if (
            existingStudent.studentName !== s.studentName ||
            existingStudent.semesterId !== s.semesterId ||
            existingStudent.section !== s.section
          ) {
            existingStudent.studentName = s.studentName;
            existingStudent.semesterId = s.semesterId;
            existingStudent.section = s.section;
            await existingStudent.save();
            updatedCount++;
          }
        } else {
          await Student.create(s);
          addedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Parsed ${students.length} students. Added ${addedCount} new, updated ${updatedCount} existing. [Database Mode: ${isMongoConnected ? 'MongoDB' : 'In-Memory fallback'}]`,
      data: {
        totalParsed: students.length,
        added: addedCount,
        updated: updatedCount
      }
    });
  } catch (error) {
    console.error('Upload PDF Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all students (with search, filter, and optional pagination)
// @route   GET /api/students
// @access  Public
export const getStudents = async (req, res) => {
  try {
    const { search, section, semesterId, page, limit } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const skipNum = (pageNum - 1) * limitNum;

    if (!isMongoConnected) {
      // In-Memory Implementation
      let filtered = [...studentsDb];

      if (section) {
        filtered = filtered.filter((s) => s.section === section);
      }

      if (semesterId) {
        filtered = filtered.filter((s) => s.semesterId === semesterId);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.studentName.toLowerCase().includes(searchLower) ||
            s.rollNo.toLowerCase().includes(searchLower) ||
            s.semesterId.toLowerCase().includes(searchLower)
        );
      }

      // Sort alphabetically by rollNo
      filtered.sort((a, b) => a.rollNo.localeCompare(b.rollNo));

      const total = filtered.length;
      const paginated = filtered.slice(skipNum, skipNum + limitNum);

      return res.status(200).json({
        success: true,
        count: paginated.length,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum
        },
        data: paginated
      });
    }

    // MongoDB Implementation
    const query = {};
    if (section) query.section = section;
    if (semesterId) query.semesterId = semesterId;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { studentName: searchRegex },
        { rollNo: searchRegex },
        { semesterId: searchRegex }
      ];
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ rollNo: 1 })
      .skip(skipNum)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      count: students.length,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      },
      data: students
    });
  } catch (error) {
    console.error('Get Students Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Public
export const getStudentById = async (req, res) => {
  try {
    if (!isMongoConnected) {
      const student = studentsDb.find((s) => s._id === req.params.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      return res.status(200).json({ success: true, data: student });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    return res.status(200).json({ success: true, data: student });
  } catch (error) {
    console.error('Get Student Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student details
// @route   PUT /api/students/:id
// @access  Public
export const updateStudent = async (req, res) => {
  try {
    const { studentName, semesterId, section, rollNo } = req.body;

    if (!isMongoConnected) {
      const studentIndex = studentsDb.findIndex((s) => s._id === req.params.id);
      if (studentIndex === -1) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const student = studentsDb[studentIndex];

      if (rollNo && rollNo !== student.rollNo) {
        const duplicate = studentsDb.find((s) => s.rollNo === rollNo);
        if (duplicate) {
          return res.status(400).json({ success: false, message: 'Roll number already exists.' });
        }
        student.rollNo = rollNo;
      }

      if (studentName) student.studentName = studentName;
      if (semesterId) student.semesterId = semesterId;
      if (section) student.section = section;
      student.updatedAt = new Date().toISOString();

      studentsDb[studentIndex] = student;
      return res.status(200).json({ success: true, data: student });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (rollNo && rollNo !== student.rollNo) {
      const duplicate = await Student.findOne({ rollNo });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Roll number already exists.' });
      }
      student.rollNo = rollNo;
    }

    if (studentName) student.studentName = studentName;
    if (semesterId) student.semesterId = semesterId;
    if (section) student.section = section;

    const updatedStudent = await student.save();
    return res.status(200).json({ success: true, data: updatedStudent });
  } catch (error) {
    console.error('Update Student Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Public
export const deleteStudent = async (req, res) => {
  try {
    if (!isMongoConnected) {
      const studentIndex = studentsDb.findIndex((s) => s._id === req.params.id);
      if (studentIndex === -1) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      
      studentsDb.splice(studentIndex, 1);
      // Clean up attendance records for deleted student to preserve integrity
      for (let i = attendanceDb.length - 1; i >= 0; i--) {
        if (attendanceDb[i].studentId === req.params.id) {
          attendanceDb.splice(i, 1);
        }
      }

      return res.status(200).json({ success: true, message: 'Student deleted successfully.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await Student.deleteOne({ _id: req.params.id });
    return res.status(200).json({ success: true, message: 'Student deleted successfully.' });
  } catch (error) {
    console.error('Delete Student Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
