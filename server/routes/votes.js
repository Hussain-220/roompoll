const express = require('express');
const Vote = require('../models/Vote');

const router = express.Router();

// POST /api/votes — Submit a vote (anonymous)
router.post('/', async (req, res) => {
  const { roomId, questionId, participantId, answer } = req.body;

  if (!roomId || !questionId || !participantId || !answer) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const vote = await Vote.create({ roomId, questionId, participantId, answer });
    res.status(201).json({ message: 'Vote submitted', vote });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Already voted on this question' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/votes/:questionId — Get aggregated results
router.get('/:questionId', async (req, res) => {
  const votes = await Vote.find({ questionId: req.params.questionId });
  const totalVotes = votes.length;

  const counts = {};
  votes.forEach((v) => {
    counts[v.answer] = (counts[v.answer] || 0) + 1;
  });

  const results = Object.entries(counts).map(([option, count]) => ({ option, count }));
  res.json({ results, totalVotes });
});

module.exports = router;
