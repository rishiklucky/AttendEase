import mongoose from 'mongoose';

const textpadSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin user reference is required'],
    unique: true, // One textpad per admin
    index: true
  },
  encryptedText: {
    type: String,
    required: [true, 'Encrypted text is required']
  }
}, {
  timestamps: true
});

const Textpad = mongoose.model('Textpad', textpadSchema);

export default Textpad;
