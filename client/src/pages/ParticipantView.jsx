import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export default function ParticipantView() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { socket, connected, subscribe, emit } = useSocket();
  const participantId = localStorage.getItem('participantId');
  
  const [question, setQuestion] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [roomTitle, setRoomTitle] = useState('');
  const [voted, setVoted] = useState(false);
  const [openText, setOpenText] = useState('');
  const [finalResults, setFinalResults] = useState([]);

  useEffect(() => {
    if (!socket || !connected) {
      console.log('⏳ Waiting for socket connection...');
      return;
    }

    console.log('🔗 Socket connected, joining room:', code);
    emit('join-room', { code, participantId });

    const unsubJoined = subscribe('room-joined', (data) => {
      console.log('✅ room-joined event received:', data);
      setRoomTitle(data.roomTitle);
      setStatus(data.status);
      setQuestion(data.question);
      setVoted(false);
    });

    const unsubChanged = subscribe('question-changed', (data) => {
      console.log('📣 question-changed event received:', data);
      setQuestion(data.question);
      setStatus('active');
      setVoted(false);
      setOpenText('');
    });

    const unsubEnded = subscribe('session-ended', (data) => {
      console.log('🏁 session-ended event received:', data);
      console.log('📊 Results structure:', JSON.stringify(data.results, null, 2));
      if (data.results) {
        data.results.forEach((r, i) => {
          console.log(`Result ${i}:`, {
            questionText: r.questionText,
            type: r.type,
            correctAnswer: r.correctAnswer,
            options: r.options
          });
        });
      }
      setStatus('ended');
      if (data.results) setFinalResults(data.results);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.5 } });
    });

    const unsubError = subscribe('vote-error', (data) => {
      console.warn('❌ vote-error:', data);
      toast.error(data.message);
      setVoted(true);
    });

    return () => {
      unsubJoined();
      unsubChanged();
      unsubEnded();
      unsubError();
    };
  }, [socket, connected, code, participantId]);

  useEffect(() => {
    if (question) {
      const hasVoted = localStorage.getItem(`voted_${question._id}`);
      if (hasVoted) setVoted(true);
    }
  }, [question]);

  const submitVote = (answer) => {
    if (!answer || voted) return;
    emit('submit-vote', { roomCode: code, questionId: question._id, answer, participantId });
    setVoted(true);
    localStorage.setItem(`voted_${question._id}`, answer);
    toast.success('Vote submitted!', { icon: '🎉' });
  };

  const handleJoinAnother = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('voted_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    navigate('/join');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
      <AnimatePresence mode="wait">
        {status === 'ended' ? (
          <motion.div key="ended" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col pt-8 pb-16">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold mb-2">That's a wrap!</h2>
              <p className="text-[var(--text-secondary)] text-lg mb-6">Here's how everyone voted</p>
              
              <div className="badge badge-accent px-4 py-2 text-md font-bold mx-auto inline-block">
                You voted on {finalResults.filter(q => localStorage.getItem(`voted_${String(q.questionId || q._id)}`) !== null).length} of {finalResults.length} questions
              </div>
            </div>

            <div className="flex flex-col gap-6 w-full">
              {finalResults.map((qResult, idx) => {
                const myAnswer = localStorage.getItem(`voted_${String(qResult.questionId || qResult._id)}`);
                const totalVotes = qResult.totalVotes || 0;
                
                return (
                  <div key={qResult.questionId || qResult._id} className="card p-6 bg-[var(--bg-elevated)] w-full">
                    <h3 className="text-xl font-bold mb-6">{idx + 1}. {qResult.questionText}</h3>
                    <div className="flex flex-col gap-4">
                      {qResult.type === 'rating' ? (
                        <>
                          {['1','2','3','4','5'].map(star => {
                            const opt = qResult.options.find(r => r.answer === star);
                            const count = opt ? opt.count : 0;
                            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            const isWinner = star === qResult.winner && count > 0;
                            const isMyVote = myAnswer === star;
                            
                            return (
                              <div key={star} className={`relative p-3 rounded-lg border overflow-hidden ${isWinner ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                                <div className="absolute inset-0 bg-[var(--bg-surface)] -z-10">
                                  <div 
                                    className={`h-full ${isWinner ? 'bg-[var(--accent)] opacity-20' : 'bg-[var(--text-secondary)] opacity-10'}`} 
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center w-full z-10 text-sm md:text-base">
                                  <div className="font-bold flex items-center gap-2">
                                    {isWinner && <span className="text-[var(--accent)]">🏆</span>}
                                    {'⭐'.repeat(Number(star))} {star} star
                                    {isMyVote && <span className="badge bg-[var(--accent)] text-white text-xs px-2 py-0.5 ml-2">Your vote ✓</span>}
                                  </div>
                                  <div className="font-bold text-[var(--text-secondary)]">
                                    {count} votes · {pct}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-2 text-sm text-[var(--text-secondary)] font-bold text-center">
                            Average rating: {totalVotes > 0 ? (qResult.options.reduce((sum, r) => sum + Number(r.answer) * r.count, 0) / totalVotes).toFixed(1) : '—'} / 5
                          </div>
                        </>
                      ) : (
                        qResult.options.map((opt, oIdx) => {
                          const isMyVote = opt.answer === myAnswer;
                          const isCorrect = qResult.correctAnswer && opt.answer === qResult.correctAnswer;
                          const isMyAnswerCorrect = isMyVote && isCorrect;
                          const isMyAnswerWrong = isMyVote && !isCorrect && qResult.correctAnswer;
                          const pct = opt.percentage !== undefined ? opt.percentage : (totalVotes > 0 ? Math.round((opt.count / totalVotes) * 100) : 0);
                          
                          // Determine background color
                          let bgColor = 'bg-gray-300';
                          let bgOpacity = 'opacity-5';
                          let borderColor = 'border border-[var(--border)]';
                          
                          if (isMyAnswerCorrect) {
                            // User selected this and it's correct - light green
                            bgColor = 'bg-green-500';
                            bgOpacity = 'opacity-15';
                            borderColor = 'border-2 border-green-400';
                          } else if (isMyAnswerWrong) {
                            // User selected this but it's wrong - light red
                            bgColor = 'bg-red-500';
                            bgOpacity = 'opacity-15';
                            borderColor = 'border-2 border-red-400';
                          } else if (isCorrect) {
                            // This is the correct answer (but user didn't select it) - light green
                            bgColor = 'bg-green-500';
                            bgOpacity = 'opacity-10';
                            borderColor = 'border border-green-300';
                          }
                          
                          return (
                            <div key={oIdx} className={`relative p-4 rounded-lg ${borderColor} overflow-hidden transition-all hover:shadow-md`}>
                              {/* Background bar */}
                              <div className="absolute inset-0 bg-[var(--bg-surface)] -z-10">
                                <div 
                                  className={`h-full ${bgColor} ${bgOpacity}`} 
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              
                              {/* Content */}
                              <div className="flex justify-between items-center w-full z-10">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="font-bold text-base md:text-lg text-[var(--text-primary)]">{opt.answer}</span>
                                  
                                  {/* Your vote indicator */}
                                  {isMyVote && (
                                    <span className="badge bg-[var(--accent)] text-white text-xs px-2 py-1 font-semibold">
                                      Your vote ✓
                                    </span>
                                  )}
                                  
                                  {/* Correct answer indicator (if they didn't select it) */}
                                  {isCorrect && !isMyVote && (
                                    <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded">✓ Correct</span>
                                  )}
                                </div>
                                
                                {/* Vote count & percentage */}
                                <div className="text-right ml-4 whitespace-nowrap text-[var(--text-secondary)]">
                                  <div className="font-bold">{opt.count}</div>
                                  <div className="text-xs">{pct}%</div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="mt-4 text-sm text-[var(--text-secondary)] text-right font-bold">{totalVotes} total votes</div>
                  </div>
                );
              })}
            </div>
            
            <button onClick={handleJoinAnother} className="btn-primary w-full py-4 mt-10 text-lg sticky bottom-4 shadow-xl z-20">Join Another Room →</button>
          </motion.div>
        ) : status === 'waiting' || !question ? (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center w-full">
            <h1 className="text-2xl font-bold mb-8 text-gradient">{roomTitle || 'Room ' + code}</h1>
            <div className="card w-full p-10 flex flex-col items-center">
              <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                <div className="w-16 h-16 bg-[var(--accent-glow)] rounded-full flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-[var(--accent)] rounded-full"></div>
                </div>
              </motion.div>
              <h2 className="text-xl font-bold animate-dots">Waiting for host to start</h2>
              <p className="text-[var(--text-secondary)] mt-4 badge badge-waiting">Look at the main screen</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key={question._id} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -80 }} className="w-full">
            {/* Phase 3C: Progress Bar implementation (visual only for now) */}
            <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full mb-6 overflow-hidden">
               <motion.div className="h-full bg-[var(--accent)]" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.5 }} />
            </div>
            <div className="card p-6 w-full shadow-2xl border-t-[var(--accent)] border-t-4">
              <h2 className="text-2xl font-bold mb-8 leading-snug" style={{fontFamily:'Syne'}}>{question.text}</h2>
              
              {voted ? (
                <div className="text-center py-10 flex flex-col items-center justify-center bg-[var(--bg-elevated)] rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[var(--success)] opacity-5"></div>
                  <div className="text-[var(--success)] text-3xl mb-4">✓</div>
                  <h3 className="text-xl font-bold text-white">Your vote is in</h3>
                  <p className="text-[var(--text-secondary)] mt-2">Look at the big screen for results</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {question.type === 'mcq' && question.options.map((opt, i) => (
                    <button key={i} onClick={() => submitVote(opt)} className="w-full text-left bg-[var(--bg-elevated)] hover:bg-[var(--accent-hover)] border border-[var(--border)] hover:border-[var(--accent)] p-4 rounded-xl font-bold transition-all text-lg active:scale-95">
                      {opt}
                    </button>
                  ))}
                  
                  {question.type === 'rating' && (
                    <div className="flex justify-between bg-[var(--bg-elevated)] p-4 rounded-xl">
                      {[1,2,3,4,5].map(num => (
                        <button key={num} onClick={() => submitVote(num.toString())} className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:text-white font-bold text-xl border border-[var(--border)] transition-all active:scale-90">
                          {num}
                        </button>
                      ))}
                    </div>
                  )}

                  {question.type === 'open' && (
                    <div className="flex flex-col gap-4">
                      <textarea className="input-field min-h-[120px] resize-none text-lg p-4" placeholder="Type your answer here..." value={openText} onChange={e=>setOpenText(e.target.value)} maxLength={200}></textarea>
                      <button onClick={() => submitVote(openText)} disabled={!openText.trim()} className="btn-primary w-full py-4 text-lg">Submit Answer</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}