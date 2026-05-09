const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  participantId: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate votes per participant per question
voteSchema.index({ questionId: 1, participantId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
