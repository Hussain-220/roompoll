const Vote = require('../models/Vote');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

// Track participants per room: roomCode -> Set of socket IDs
const roomParticipants = {};

async function getVoteResults(questionId) {
  const votes = await Vote.find({ questionId });
  const counts = {};
  votes.forEach((v) => {
    counts[v.answer] = (counts[v.answer] || 0) + 1;
  });
  const results = Object.entries(counts).map(([option, count]) => ({ option, count }));
  return { results, totalVotes: votes.length };
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // --- Participant joins room ---
    socket.on('join-room', async ({ code, participantId }) => {
      const roomCode = code.toUpperCase();

      try {
        const room = await Room.findOne({ code: roomCode }).populate({
          path: 'questions',
          options: { sort: { order: 1 } },
        });

        if (!room) return;
        
        if (room.status === 'ended') {
          socket.emit('join-error', { message: 'This session has already ended.' });
          return;
        }

        socket.join(roomCode);
        if (!roomParticipants[roomCode]) roomParticipants[roomCode] = new Set();
        roomParticipants[roomCode].add(socket.id);

        const count = roomParticipants[roomCode].size;
        io.to(roomCode).emit('participant-count', { count });

        const currentQuestion =
          room.status === 'active' ? room.questions[room.currentQuestionIndex] : null;
        socket.emit('room-joined', {
          question: currentQuestion,
          totalParticipants: count,
          status: room.status,
          roomTitle: room.title,
        });
      } catch (err) {
        console.error('join-room error:', err);
      }
    });

    // --- Host joins their session room ---
    socket.on('host-join', async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      socket.join(code);
      console.log(`Host joined room: ${code}`);

      // If room is already ended, fetch and send results immediately
      const room = await Room.findOne({ code }).populate({
        path: 'questions',
        options: { sort: { order: 1 } },
      });

      if (room && room.status === 'ended') {
        console.log('Room already ended, fetching results for host');
        const results = await Promise.all(
          room.questions.map(async (question) => {
            const votes = await Vote.find({ questionId: question._id });
            const totalVotes = votes.length;

            const tally = {};
            votes.forEach(v => {
              tally[v.answer] = (tally[v.answer] || 0) + 1;
            });

            let options = Object.entries(tally)
              .map(([answer, count]) => ({
                answer,
                count,
                percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
              }))
              .sort((a, b) => b.count - a.count);

            let displayOptions = options;
            if (question.type === 'rating') {
              displayOptions = ['1','2','3','4','5'].map(star => {
                const found = options.find(o => o.answer === star);
                return found || { answer: star, count: 0, percentage: 0 };
              });
            } else if (question.type === 'mcq') {
              displayOptions = question.options.map(opt => {
                const found = options.find(o => o.answer === opt);
                return found || { answer: opt, count: 0, percentage: 0 };
              }).sort((a,b) => b.count - a.count);
            }

            const winner = options.length > 0 ? options[0].answer : null;

            return {
              questionId: question._id.toString(),
              questionText: question.text,
              type: question.type,
              options: displayOptions,
              totalVotes,
              winner,
              correctAnswer: question.correctAnswer || null
            };
          })
        );

        socket.emit('session-ended', {
          roomTitle: room.title,
          results
        });
      }
    });

    // --- Participant submits vote ---
    socket.on('submit-vote', async ({ questionId, answer, participantId, roomCode }) => {
      try {
        const existing = await Vote.findOne({ questionId, participantId });
        if (existing) {
          socket.emit('vote-error', { message: 'Already voted' });
          return;
        }

        const room = await Room.findOne({ code: roomCode.toUpperCase() });
        if (!room) return;

        await Vote.create({ roomId: room._id, questionId, participantId, answer });

        const { results, totalVotes } = await getVoteResults(questionId);
        io.to(roomCode.toUpperCase()).emit('vote-update', { results, totalVotes, questionId });
      } catch (err) {
        if (err.code === 11000) {
          socket.emit('vote-error', { message: 'Already voted' });
        } else {
          console.error('submit-vote error:', err);
        }
      }
    });

    // --- Host advances to next/prev question ---
    socket.on('next-question', async ({ roomCode, index }) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const code = roomCode.toUpperCase();
        
        const room = await Room.findOne({ code }).populate({
          path: 'questions',
          options: { sort: { order: 1 } },
        });
        if (!room || room.hostId.toString() !== decoded.id) return;

        room.currentQuestionIndex = index;
        await room.save();

        const question = room.questions[index];
        io.to(code).emit('question-changed', { question, index, total: room.questions.length });
      } catch (err) {
        console.error('next-question error:', err);
      }
    });

    // --- Host ends session ---
    socket.on('end-session', async ({ roomCode }) => {
      try {
        console.log('end-session received with roomCode:', roomCode);
        const token = socket.handshake.auth.token;
        if (!token) {
          console.log('end-session: no token');
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('end-session: decoded token, id:', decoded.id, 'userId:', decoded.userId);
        const code = roomCode.toUpperCase();
        
        // 1. Update room status
        const room = await Room.findOneAndUpdate(
          { code: code },
          { status: 'ended' },
          { new: true }
        ).populate('questions');

        if (!room) {
          console.error('end-session: room not found for code', code);
          return;
        }

        // Verify host ownership using whichever field exists in decoded token
        const hostId = room.hostId.toString();
        const tokenId = (decoded.id || decoded.userId || decoded._id || '').toString();
        if (hostId !== tokenId) {
          console.error('end-session: unauthorized. hostId:', hostId, 'tokenId:', tokenId);
          return;
        }

        // 2. Build full results for every question
        const results = await Promise.all(
          room.questions.map(async (question) => {
            const votes = await Vote.find({ questionId: question._id });
            const totalVotes = votes.length;

            // Group votes by answer
            const tally = {};
            votes.forEach(v => {
              tally[v.answer] = (tally[v.answer] || 0) + 1;
            });

            // Build options array sorted by count desc
            let options = Object.entries(tally)
              .map(([answer, count]) => ({
                answer,
                count,
                percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
              }))
              .sort((a, b) => b.count - a.count);

            // For rating: fill in missing stars with 0, or mcq missing options with 0
            let displayOptions = options;
            if (question.type === 'rating') {
              displayOptions = ['1','2','3','4','5'].map(star => {
                const found = options.find(o => o.answer === star);
                return found || { answer: star, count: 0, percentage: 0 };
              });
            } else if (question.type === 'mcq') {
              displayOptions = question.options.map(opt => {
                const found = options.find(o => o.answer === opt);
                return found || { answer: opt, count: 0, percentage: 0 };
              }).sort((a,b) => b.count - a.count);
            }

            const winner = options.length > 0 ? options[0].answer : null;

            return {
              questionId: question._id.toString(),
              questionText: question.text,
              type: question.type,
              options: displayOptions,
              totalVotes,
              winner
            };
          })
        );

        // 3. Build final payload
        const payload = {
          roomTitle: room.title,
          results
        };

        // 4. Emit to ALL in room including the host
        console.log('Emitting session-ended to room:', code, 'results count:', results.length);
        io.in(code).emit('session-ended', payload);
      } catch (err) {
        console.error('end-session error:', err);
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      for (const [code, participants] of Object.entries(roomParticipants)) {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          io.to(code).emit('participant-count', { count: participants.size });
        }
      }
    });
  });
};
