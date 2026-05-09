import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (id) => {
    if(!confirm('Are you sure?')) return;
    try {
      await axios.delete(`/rooms/${id}`);
      setRooms(rooms.filter(r => r._id !== id));
      toast.success('Room deleted');
    } catch (err) {
      toast.error('Failed to delete room');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="section-title">Your Rooms</h1>
        <Link to="/rooms/new" className="btn-primary">New Room</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48"></div>)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 card">
          <h2 className="text-2xl font-bold mb-4">No rooms yet...</h2>
          <Link to="/rooms/new" className="btn-primary">Create your first room</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rooms.map(room => (
            <div key={room._id} className="card p-6 flex flex-col items-start gap-4">
              <div className="w-full flex justify-between items-start">
                <h2 className="text-xl font-bold truncate pr-3">{room.title}</h2>
                <span className={`badge badge-${room.status}`}>{room.status}</span>
              </div>
              <div className="bg-[var(--bg-elevated)] px-3 py-1 rounded-md mb-2 flex gap-2">
                <span className="text-[var(--text-secondary)] text-sm">Code:</span>
                <span className="font-bold tracking-widest">{room.code}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{room.questions.length} Questions</p>
              
              <div className="mt-auto pt-4 border-t border-[var(--border)] w-full flex gap-2">
                {room.status === 'waiting' && <button onClick={() => navigate(`/session/${room.code}`)} className="btn-primary flex-1 py-2 rounded-lg text-sm">Start Session</button>}
                {room.status === 'active' && <button onClick={() => navigate(`/session/${room.code}`)} className="btn-secondary flex-1 py-2 rounded-lg text-sm border-glow">Resume</button>}
                {room.status === 'ended' && <button onClick={() => navigate(`/session/${room.code}`)} className="btn-ghost flex-1 py-2 rounded-lg text-sm">Results</button>}
                <button onClick={() => deleteRoom(room._id)} className="btn-danger px-4 py-2 rounded-lg text-sm">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}