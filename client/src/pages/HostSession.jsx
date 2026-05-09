import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';

export default function HostSession() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { socket, connected, subscribe, emit } = useSocket();
  const [room, setRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('waiting');
  const [participantCount, setParticipantCount] = useState(0);
  const [voteResults, setVoteResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [finalResults, setFinalResults] = useState([]);
  const [finalIndex, setFinalIndex] = useState(0);

  useEffect(() => { fetchRoom(); }, [code]);

  const fetchRoom = async () => {
    try {
      const res = await axios.get(`/rooms/${code}`);
      setRoom(res.data);
      setQuestions(res.data.questions);
      setCurrentIndex(res.data.currentQuestionIndex || 0);
      setStatus(res.data.status);
      if (res.data.status !== 'waiting') fetchResults(res.data.questions[res.data.currentQuestionIndex]._id);
    } catch (err) {
      toast.error('Room not found'); navigate('/dashboard');
    }
  };

  const fetchResults = async (qId) => {
    try {
      const res = await axios.get(`/votes/${qId}`);
      setVoteResults(res.data.results); setTotalVotes(res.data.totalVotes);
    } catch (err) {}
  };

  useEffect(() => {
    if (!socket || !connected) return;
    emit('host-join', { roomCode: code });
    const unsubCount = subscribe('participant-count', (data) => setParticipantCount(data.count));
    const unsubVote = subscribe('vote-update', (data) => {
      setVoteResults(data.results); setTotalVotes(data.totalVotes);
    });
    const unsubEnded = subscribe('session-ended', (data) => {
      console.log('session-ended received by host:', data);
      setStatus('ended');
      if (data.results) {
        setFinalResults(data.results);
      }
    });
    return () => { unsubCount(); unsubVote(); unsubEnded(); };
  }, [socket, connected, code]);

  const startSession = async () => {
    try {
      await axios.patch(`/rooms/${code}/start`);
      setStatus('active');
      emit('next-question', { roomCode: code, index: 0 });
      fetchResults(questions[0]._id);
    } catch (err) { toast.error('Failed to start session'); }
  };

  const goToQuestion = async (index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index); setVoteResults([]); setTotalVotes(0);
    emit('next-question', { roomCode: code, index });
    fetchResults(questions[index]._id);
  };

  const endSession = async () => {
    if (!confirm('End session for everyone?')) return;
    try {
      console.log('endSession called, socket connected:', connected, 'code:', code);
      await axios.patch(`/rooms/${code}/end`);
      console.log('API call succeeded, emitting end-session');
      emit('end-session', { roomCode: code });
      console.log('emit called');
      toast.success('Session Ended');
    } catch (err) {
      console.error('endSession error:', err);
      toast.error('Failed to end session');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    toast.success('Link copied!');
  };

  const currentQ = questions[currentIndex];
  const processedData = useMemo(() => {
    if (!currentQ || currentQ.type !== 'mcq') return voteResults || [];
    return (currentQ.options || []).map(opt => {
      const match = (voteResults || []).find(v => v.option === opt);
      return { option: opt, count: match ? match.count : 0 };
    });
  }, [voteResults, currentQ]);

  if (!room || !questions.length) return <div className="text-center mt-20">Loading...</div>;

  if (status === 'ended') {
    if (finalResults.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-800">
          <div className="text-center">
            <span className="text-4xl block mb-4">⏳</span>
            <h2 className="text-2xl font-bold">Loading results...</h2>
          </div>
        </div>
      );
    }
    const qResult = finalResults[finalIndex];
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col p-8 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-glow)] animate-pulse" style={{fontFamily:'Syne'}}>Session Complete</h2>
          <div className="badge badge-success text-xl px-4 py-2">{participantCount} Participants</div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <button 
            disabled={finalIndex === 0} 
            onClick={() => setFinalIndex(i => i - 1)}
            className="btn-secondary px-6 py-2 disabled:opacity-50"
          >← Prev</button>
          <div className="text-xl font-bold text-[var(--text-secondary)]">Question {finalIndex + 1} of {finalResults.length}</div>
          <button 
            disabled={finalIndex === finalResults.length - 1} 
            onClick={() => setFinalIndex(i => i + 1)}
            className="btn-secondary px-6 py-2 disabled:opacity-50"
          >Next →</button>
        </div>

        <motion.div 
          key={qResult.questionId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 bg-[var(--bg-elevated)] flex-1 flex flex-col"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-3xl font-bold max-w-2xl leading-snug">{qResult.questionText}</h3>
            <div className="badge border border-[var(--border)] text-lg px-4 py-2">{qResult.totalVotes} votes</div>
          </div>

          <div className="flex flex-col gap-6 mt-4">
            {qResult.type === 'rating' ? (
              <>
                {['1','2','3','4','5'].map(star => {
                  const opt = qResult.options.find(r => r.answer === star);
                  const count = opt ? opt.count : 0;
                  const pct = qResult.totalVotes > 0 ? Math.round((count / qResult.totalVotes) * 100) : 0;
                  const isWinner = star === qResult.winner && count > 0;
                  return (
                    <div key={star} className={`relative p-4 rounded-xl border-2 transition-all ${isWinner ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                      <div className="absolute inset-0 bg-[var(--bg-surface)] rounded-xl overflow-hidden -z-10">
                        <motion.div 
                          className={`h-full ${isWinner ? 'bg-[var(--accent)] opacity-20' : 'bg-[var(--text-secondary)] opacity-10'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="flex justify-between items-center w-full z-10 text-xl md:text-2xl">
                        <span className={`font-bold ${isWinner ? 'text-[var(--accent)]' : ''}`}>
                          {isWinner && '🏆 '}
                          {'⭐'.repeat(Number(star))} <span className="text-lg text-[var(--text-secondary)]">{star} star</span>
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">{pct}%</span>
                          <span className="text-lg text-[var(--text-secondary)]">({count})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 text-xl text-[var(--text-secondary)] font-bold text-center">
                  Average rating: {qResult.totalVotes > 0 ? (qResult.options.reduce((sum, r) => sum + Number(r.answer) * r.count, 0) / qResult.totalVotes).toFixed(1) : '—'} / 5
                </div>
              </>
            ) : (
             qResult.options.map((opt, idx) => {
              const isWinner = qResult.winner && opt.answer === qResult.winner && opt.count > 0;
              return (
                <div key={idx} className={`relative p-4 rounded-xl border-2 transition-all ${isWinner ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                  <div className="absolute inset-0 bg-[var(--bg-surface)] rounded-xl overflow-hidden -z-10">
                    <motion.div 
                      className={`h-full ${isWinner ? 'bg-[var(--accent)] opacity-20' : 'bg-[var(--text-secondary)] opacity-10'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${opt.percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between items-center z-10 w-full">
                    <span className={`text-xl font-bold ${isWinner ? 'text-[var(--accent)]' : ''}`}>
                      {isWinner && '🏆 '}{opt.answer}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold">{opt.percentage}%</span>
                      <span className="text-[var(--text-secondary)]">({opt.count})</span>
                    </div>
                  </div>
                </div>
              );
             })
            )}
          </div>
        </motion.div>

        <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-4 mt-10 text-lg">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 h-[calc(100vh-64px)]">
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div className="card p-5 flex flex-col gap-4 bg-[var(--bg-elevated)] min-w-[220px] max-w-[280px] mx-auto md:mx-0">
          <div className="text-center w-full">
            <h2 className="text-[2rem] font-bold tracking-[0.25em]" style={{fontFamily:'monospace'}}>{code}</h2>
          </div>
          
          <div className="bg-white p-3 rounded-xl mx-auto w-[140px] h-[140px] flex items-center justify-center">
            <QRCodeSVG value={`${window.location.origin}/join?code=${code}`} size={120} />
          </div>
          
          <div className="flex flex-col gap-2 w-full mt-2">
            <button onClick={copyCode} className="btn-secondary w-full py-3 text-sm">Copy Code</button>
            <button onClick={copyUrl} className="btn-primary w-full py-3 text-sm">Copy Join Link</button>
          </div>

          <div className="badge badge-success mt-2 mx-auto">
            {participantCount} Participant{participantCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-[var(--text-secondary)]">Status</span>
            <span className={`badge badge-${status}`}>{status.toUpperCase()}</span>
          </div>
          {status === 'waiting' && <button onClick={startSession} className="btn-primary w-full py-4 text-lg">Start Session</button>}
          {status === 'active' && <button onClick={endSession} className="btn-danger w-full py-3">End Session</button>}
        </div>
      </div>

      <div className="w-full md:w-2/3 flex flex-col gap-6">
        {status === 'waiting' ? (
          <div className="card flex-1 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold">Waiting to start...</h2>
          </div>
        ) : (
          <div className="card flex-1 flex flex-col p-8 bg-[var(--bg-surface)]">
            <div className="flex justify-between items-center mb-8 border-b border-[var(--border)] pb-4">
              <span className="badge badge-accent font-bold px-4 py-1">Q {currentIndex + 1} / {questions.length}</span>
              <span className="text-[var(--text-secondary)] font-bold">{totalVotes} Votes</span>
            </div>
            
            <h2 className="text-3xl font-bold mb-10 text-center leading-relaxed" style={{fontFamily:'Syne'}}>{currentQ.text}</h2>
            
            <div className="flex-1 min-h-[300px] w-full">
              {currentQ.type === 'mcq' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="option" type="category" width={150} tick={{fill: '#F1F0FF'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1E1E38', border: 'none'}} />
                    <Bar dataKey="count" fill="var(--accent)" radius={[0, 8, 8, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {currentQ.type === 'rating' && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="text-7xl font-bold text-[var(--accent)]">
                    {totalVotes > 0 ? (voteResults.reduce((a, c) => a + (parseInt(c.option)*c.count), 0) / totalVotes).toFixed(1) : '0.0'}
                  </div>
                </div>
              )}
              {currentQ.type === 'open' && (
                <div className="h-full overflow-y-auto pr-4 flex flex-wrap gap-2 content-start">
                  {voteResults.map((v, i) => (
                    <div key={i} className="bg-[var(--bg-elevated)] px-4 py-3 rounded-xl border border-[var(--border)]">{v.option} {v.count > 1 && <span>({v.count})</span>}</div>
                  ))}
                </div>
              )}
            </div>

            {status === 'active' && (
              <div className="flex justify-between mt-8 pt-6 border-t border-[var(--border)]">
                <button onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0} className="btn-secondary px-6">← Prev</button>
                <button onClick={() => goToQuestion(currentIndex + 1)} disabled={currentIndex === questions.length - 1} className="btn-primary px-8">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
