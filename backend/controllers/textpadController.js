import crypto from 'crypto';
import Textpad from '../models/Textpad.js';
import { isMongoConnected } from '../config/db.js';
import { textpadDb } from './inMemoryDb.js';

// ─── Encryption Helpers ──────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Derive a 32-byte key from JWT_SECRET
const getEncryptionKey = () => {
  const secret = process.env.JWT_SECRET || 'attendease_fallback_secret_key';
  return crypto.createHash('sha256').update(secret).digest();
};

// Encrypt plain text into "iv_hex:ciphertext_hex"
const encryptText = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

// Decrypt "iv_hex:ciphertext_hex" back to plain text
const decryptText = (encryptedText) => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Decryption Error: Secret key mismatch or corrupted data]';
  }
};

// @desc    Upsert (create or update) the current admin's personal secure textpad
// @route   POST /api/textpad
// @access  Private
export const upsertTextpadItem = async (req, res) => {
  try {
    const { text } = req.body;
    const adminId = req.user.id;

    if (text === undefined || text === null) {
      return res.status(400).json({ success: false, message: 'Please provide text content.' });
    }

    // Encrypt the text for storage
    const encryptedText = encryptText(text);

    if (!isMongoConnected) {
      // In-Memory Implementation
      let item = textpadDb.find((t) => t.personId === adminId);
      if (item) {
        item.encryptedText = encryptedText;
        item.updatedAt = new Date().toISOString();
      } else {
        item = {
          _id: `mem_pad_${Math.random().toString(36).substr(2, 9)}`,
          personId: adminId,
          encryptedText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        textpadDb.push(item);
      }

      return res.status(200).json({
        success: true,
        message: 'Personal textpad saved securely (In-Memory).'
      });
    }

    // MongoDB Implementation
    await Textpad.findOneAndUpdate(
      { personId: adminId },
      { encryptedText },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Personal textpad saved securely to database.'
    });
  } catch (error) {
    console.error('Upsert Textpad Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the current admin's personal textpad details (decrypted)
// @route   GET /api/textpad/me
// @access  Private
export const getTextpadItem = async (req, res) => {
  try {
    const adminId = req.user.id;

    if (!isMongoConnected) {
      // In-Memory Implementation
      const item = textpadDb.find((t) => t.personId === adminId) || null;
      const decrypted = item ? decryptText(item.encryptedText) : '';
      return res.status(200).json({
        success: true,
        text: decrypted
      });
    }

    // MongoDB Implementation
    const item = await Textpad.findOne({ personId: adminId });
    const decrypted = item ? decryptText(item.encryptedText) : '';

    return res.status(200).json({
      success: true,
      text: decrypted
    });
  } catch (error) {
    console.error('Get Textpad Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete the current admin's personal textpad
// @route   DELETE /api/textpad/me
// @access  Private
export const deleteTextpadItem = async (req, res) => {
  try {
    const adminId = req.user.id;

    if (!isMongoConnected) {
      const index = textpadDb.findIndex((t) => t.personId === adminId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Textpad record not found.' });
      }
      textpadDb.splice(index, 1);
      return res.status(200).json({ success: true, message: 'Personal textpad cleared.' });
    }

    const item = await Textpad.findOne({ personId: adminId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Textpad record not found.' });
    }

    await Textpad.deleteOne({ personId: adminId });
    return res.status(200).json({ success: true, message: 'Personal textpad cleared.' });
  } catch (error) {
    console.error('Delete Textpad Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
