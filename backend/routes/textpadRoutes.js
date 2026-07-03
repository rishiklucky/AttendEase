import express from 'express';
import {
  upsertTextpadItem,
  getTextpadItem,
  deleteTextpadItem
} from '../controllers/textpadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected by JWT auth middleware
router.post('/', protect, upsertTextpadItem);
router.get('/me', protect, getTextpadItem);
router.delete('/me', protect, deleteTextpadItem);

export default router;
