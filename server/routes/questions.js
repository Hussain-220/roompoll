const express = require('express');
const Question = require('../models/Question');
const Room = require('../models/Room');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/questions — Add question to room
router.post('/', protect, async (req, res) => {
  const { roomId, text, type, options, order } = req.body;

  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.hostId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const question = await Question.create({ roomId, text, type, options: options || [], order: order || 0 });

  room.questions.push(question._id);
  await room.save();

  res.status(201).json(question);
});

// PUT /api/questions/:id — Edit question
router.put('/:id', protect, async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });

  const room = await Room.findById(question.roomId);
  if (room.hostId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const { text, type, options, order } = req.body;
  if (text !== undefined) question.text = text;
  if (type !== undefined) question.type = type;
  if (options !== undefined) question.options = options;
  if (order !== undefined) question.order = order;

  await question.save();
  res.json(question);
});

// DELETE /api/questions/:id — Delete question
router.delete('/:id', protect, async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });

  const room = await Room.findById(question.roomId);
  if (room.hostId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  room.questions = room.questions.filter((q) => q.toString() !== question._id.toString());
  await room.save();
  await question.deleteOne();

  res.json({ message: 'Question deleted' });
});

module.exports = router;
