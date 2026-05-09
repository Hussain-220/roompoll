import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>
      
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-[#a78bfa] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>

      <div className="text-center z-10 max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Your questions. <br/><span className="text-gradient">Live answers.</span> Zero friction.
        </h1>
        <p className="text-xl text-[var(--text-secondary)] mb-10">
          Create an interactive room in seconds. No signup required for participants. Watch anonymous votes roll in live.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/join" className="btn-primary text-lg">Join a Room</Link>
          <Link to="/register" className="btn-secondary text-lg">Create a Room (Host)</Link>
        </div>
      </div>
    </motion.div>
  );
}