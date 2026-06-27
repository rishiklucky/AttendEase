import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getSavedRecipients,
  saveRecipients,
  deleteRecipient
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// router.post('/register', registerAdmin);

router.post('/login', loginAdmin);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Recipients list management routes
router.get('/recipients', protect, getSavedRecipients);
router.post('/recipients', protect, saveRecipients);
router.delete('/recipients/:email', protect, deleteRecipient);

export default router;
