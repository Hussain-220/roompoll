import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import axios from '../api/axios';

export default function JoinRoom() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { subscribe } = useSocket();

  useEffect(() => {
    if (!localStorage.getItem('participantId')) {
      localStorage.setItem('participantId', uuidv4());
    }

    const unsub = subscribe('join-error', (data) => {
      setError(data.message);
      setLoading(false);
      toast.error(data.message);
    });

    return () => {
      unsub();
    };
  }, [subscribe]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    if (code.length !== 6) {
      setError('Code must be 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify room exists before navigating
      const res = await axios.get(`/rooms/${code.toUpperCase()}`);
      if (!res.data) {
        throw new Error('Room not found');
      }
      
      navigate(`/room/${code.toUpperCase()}`);
    } catch (err) {
      const message = err.response?.data?.message || 'Room not found. Please check the code and try again.';
      setError(message);
      setLoading(false);
      toast.error(message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center h-[calc(100vh-64px)] px-4">
      <div className={`card w-full max-w-sm p-8 text-center transition-all ${error ? 'ring-2 ring-red-500' : ''}`}>
        <h2 className="text-3xl font-bold mb-2">Join Room</h2>
        <p className="text-[var(--text-secondary)] mb-6">Enter the 6-digit code</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            className={`input-field text-center text-3xl font-bold uppercase tracking-widest ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
            style={{letterSpacing: '0.3em', maxWidth: '280px', margin: '0 auto'}} 
            maxLength={6} 
            value={code} 
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }} 
            placeholder="XXXXXX" 
            autoFocus 
            disabled={loading}
          />
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
            >
              ⚠️ {error}
            </motion.div>
          )}
          
          <button 
            type="submit" 
            disabled={loading || code.length < 6}
            className="btn-primary w-full text-lg py-4 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enter Room'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}