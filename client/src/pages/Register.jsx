import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center h-[calc(100vh-64px)] px-4">
      <div className="card w-full max-w-md p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input className="input-field" type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="input-field" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary mt-2">Register</button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
          Already have an account? <Link to="/login" className="text-[var(--accent)] hover:underline">Login</Link>
        </p>
      </div>
    </motion.div>
  );
}