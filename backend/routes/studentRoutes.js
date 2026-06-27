import express from 'express';
import multer from 'multer';
import { 
  uploadPDF, 
  getStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent 
} from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';


// Setup multer in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limit PDF size to 5MB
});

const router = express.Router();

router.post('/upload-pdf', protect, upload.single('pdf'), uploadPDF);
router.get('/', protect, getStudents);
router.get('/:id', protect, getStudentById);
router.put('/:id', protect, updateStudent);
router.delete('/:id', protect, deleteStudent);

export default router;
