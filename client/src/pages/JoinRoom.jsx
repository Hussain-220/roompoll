import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export default function JoinRoom() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const { subscribe } = useSocket();

  useEffect(() => {
    if (!localStorage.getItem('participantId')) {
      localStorage.setItem('participantId', uuidv4());
    }

    const unsub = subscribe('join-error', (data) => {
      toast.error(data.message);
      setError(true);
      setTimeout(() => setError(false), 500);
    });

    return () => {
      unsub();
    };
  }, [subscribe]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }
    navigate(`/room/${code.toUpperCase()}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center h-[calc(100vh-64px)] px-4">
      <div className={`card w-full max-w-sm p-8 text-center ${error ? 'shake border-red-500' : ''}`}>
        <h2 className="text-3xl font-bold mb-2">Join Room</h2>
        <p className="text-[var(--text-secondary)] mb-6">Enter the 6-digit code</p>
        <form onSubmit={handleSubmit}>
          <input className="input-field text-center text-3xl font-bold uppercase tracking-widest mb-6" style={{letterSpacing: '0.3em', maxWidth: '280px', margin: '0 auto 1.5rem'}} maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="XXXXXX" autoFocus />
          <button type="submit" className="btn-primary w-full text-lg py-4">Enter Room</button>
        </form>
      </div>
    </motion.div>
  );
}