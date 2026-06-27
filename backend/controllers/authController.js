import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import OtpToken from '../models/OtpToken.js';

// ─── Helper: Sign JWT ────────────────────────────────────────────────────────
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// ─── Helper: Send OTP Email ──────────────────────────────────────────────────
const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"AttendEase" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: 'AttendEase — Password Reset OTP',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0057cd; padding: 24px; text-align: center;">
          <h2 style="color: white; margin: 0;">🗒️ AttendEase</h2>
        </div>
        <div style="padding: 32px;">
          <h3 style="margin-top: 0;">Password Reset OTP</h3>
          <p>You requested to reset your password. Use the OTP below. It expires in <strong>10 minutes</strong>.</p>
          <div style="background: #f2f3ff; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0057cd;">${otp}</span>
          </div>
          <p style="color: #6c757d; font-size: 13px;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      </div>
    `
  });
};

// ─── Register Admin ──────────────────────────────────────────────────────────
// ⚠️ COMMENT OUT THIS ROUTE IN authRoutes.js AFTER YOUR FIRST REGISTRATION
export const registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An admin with this email already exists.' });
    }

    const user = await User.create({ username, email, password });
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully.',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// ─── Get Current User ────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// ─── Forgot Password — Send OTP ──────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old OTPs for this email, then save new one
    await OtpToken.deleteMany({ email });
    await OtpToken.create({ email, otp, expiresAt });

    await sendOtpEmail(email, otp);

    res.status(200).json({ success: true, message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check your email config.' });
  }
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await OtpToken.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }
    if (record.expiresAt < new Date()) {
      await OtpToken.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Mark as verified
    record.verified = true;
    await record.save();

    res.status(200).json({ success: true, message: 'OTP verified. You can now reset your password.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const record = await OtpToken.findOne({ email, otp, verified: true });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or unverified OTP. Start over.' });
    }
    if (record.expiresAt < new Date()) {
      await OtpToken.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: 'OTP session expired. Request a new OTP.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    // Clean up OTP
    await OtpToken.deleteMany({ email });

    res.status(200).json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
};

// ─── Get Saved Recipients ──────────────────────────────────────────────────
export const getSavedRecipients = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ success: true, recipients: user.savedReportRecipients || [] });
  } catch (error) {
    console.error('Get saved recipients error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve saved recipients.' });
  }
};

// ─── Save Recipients ───────────────────────────────────────────────────────
export const saveRecipients = async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ success: false, message: 'Emails array is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Merge only unique emails
    const unique = [...new Set([...(user.savedReportRecipients || []), ...emails])];
    user.savedReportRecipients = unique;
    await user.save();

    res.status(200).json({ success: true, message: 'Recipients updated successfully.', recipients: user.savedReportRecipients });
  } catch (error) {
    console.error('Save recipients error:', error);
    res.status(500).json({ success: false, message: 'Failed to save recipients.' });
  }
};

// ─── Delete Recipient ──────────────────────────────────────────────────────
export const deleteRecipient = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email param is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.savedReportRecipients = (user.savedReportRecipients || []).filter(e => e !== email);
    await user.save();

    res.status(200).json({ success: true, message: 'Recipient removed successfully.', recipients: user.savedReportRecipients });
  } catch (error) {
    console.error('Delete recipient error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete recipient.' });
  }
};
