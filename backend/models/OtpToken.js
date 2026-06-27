import mongoose from 'mongoose';

const otpTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // MongoDB TTL — auto-deletes at expiresAt time
  }
}, { timestamps: true });

const OtpToken = mongoose.model('OtpToken', otpTokenSchema);
export default OtpToken;
