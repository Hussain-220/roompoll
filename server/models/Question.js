const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'rating', 'open'],
    required: true,
  },
  options: {
    type: [String],
    default: [],
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Question', questionSchema);
