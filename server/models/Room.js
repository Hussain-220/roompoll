const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  title: {
    type: String,
    required: [true, 'Room title is required'],
    trim: true,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
  ],
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended'],
    default: 'waiting',
  },
  resultsSnapshot: {
    type: Array,
    default: [],
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', roomSchema);
