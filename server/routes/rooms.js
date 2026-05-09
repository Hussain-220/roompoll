const express = require('express');
const { customAlphabet } = require('nanoid');
const Room = require('../models/Room');
const Question = require('../models/Question');
const Vote = require('../models/Vote');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

// POST /api/rooms — Create a room
router.post('/', protect, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: 'Room title is required' });

  let code;
  let exists = true;
  while (exists) {
    code = nanoid();
    exists = await Room.findOne({ code });
  }

  const room = await Room.create({ code, title, hostId: req.user._id });
  res.status(201).json(room);
});

// GET /api/rooms — Get all rooms for this host
router.get('/', protect, async (req, res) => {
  const rooms = await Room.find({ hostId: req.user._id })
    .populate('questions')
    .sort({ createdAt: -1 });
  res.json(rooms);
});

// GET /api/rooms/:code — Get room by code
router.get('/:code', async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate({
    path: 'questions',
    options: { sort: { order: 1 } },
  });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json(room);
});

// PATCH /api/rooms/:code/start
router.patch('/:code/start', protect, async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.hostId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  room.status = 'active';
  room.currentQuestionIndex = 0;
  await room.save();
  res.json(room);
});

// PATCH /api/rooms/:code/end
router.patch('/:code/end', protect, async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate({
    path: 'questions',
    options: { sort: { order: 1 } },
  });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.hostId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  room.status = 'ended';

  const snapshot = [];
  for (const question of room.questions) {
    const results = await Vote.aggregate([
      { $match: { questionId: question._id } },
      { $group: { _id: '$answer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    snapshot.push({
      questionId: question._id,
      questionText: question.text,
      type: question.type,
      options: question.options,
      results: results.map(r => ({ answer: r._id, count: r.count }))
    });
  }
  
  room.resultsSnapshot = snapshot;
  await room.save();
  res.json(room);
});

// DELETE /api/rooms/:id
router.delete('/:id', protect, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.hostId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  await Question.deleteMany({ roomId: room._id });
  await Vote.deleteMany({ roomId: room._id });
  await room.deleteOne();

  res.json({ message: 'Room deleted' });
});

module.exports = router;
