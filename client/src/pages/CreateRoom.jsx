import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function CreateRoom() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const addQuestion = (type) => {
    setQuestions([...questions, { id: crypto.randomUUID(), text: '', type, options: type === 'mcq' ? ['', ''] : [], correctAnswer: null }]);
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId, optIdx, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts[optIdx] = value;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const addOption = (qId) => {
    setQuestions(questions.map(q => q.id === qId && q.options.length < 4 ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || questions.length === 0) return toast.error('Add a title and at least one question.');
    
    // validate
    for (const q of questions) {
      if (!q.text.trim()) return toast.error('All questions must have text');
      if (q.type === 'mcq' && q.options.some(o => !o.trim())) return toast.error('All MCQ options must be filled');
    }

    setSubmitting(true);
    try {
      const roomRes = await axios.post('/rooms', { title });
      const roomId = roomRes.data._id;
      const code = roomRes.data.code;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await axios.post('/questions', { 
          roomId, 
          text: q.text, 
          type: q.type, 
          options: q.options,
          correctAnswer: q.type === 'mcq' ? q.correctAnswer : null,
          order: i 
        });
      }

      toast.success('Room created!');
      navigate(`/session/${code}`);
    } catch (err) {
      toast.error('Failed to create room');
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-4 py-8 pb-32">
      <h1 className="section-title mb-6">Create New Room</h1>
      
      <div className="card p-6 mb-8">
        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Room Title</label>
        <input className="input-field text-xl font-bold" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Weekly Team Sync" />
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="card p-6 shadow-xl relative">
            <button type="button" onClick={() => removeQuestion(q.id)} className="absolute top-4 right-4 text-red-500 hover:text-red-400">✕</button>
            <span className="badge badge-accent mb-4">Question {index + 1} ({q.type.toUpperCase()})</span>
            
            <input className="input-field mb-4 font-medium" placeholder="Ask something..." value={q.text} onChange={e=>updateQuestion(q.id, 'text', e.target.value)} />
            
            {q.type === 'mcq' && (
              <div className="space-y-4 pl-4 border-l-2 border-[var(--border-accent)]">
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <input key={i} className="input-field py-2 text-sm" placeholder={`Option ${i+1}`} value={opt} onChange={e=>updateOption(q.id, i, e.target.value)} />
                  ))}
                  {q.options.length < 4 && <button type="button" onClick={()=>addOption(q.id)} className="btn-ghost text-xs mt-2">+ Add Option</button>}
                </div>
                
                <div className="mt-4 p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">✅ Select Correct Answer:</label>
                  <select 
                    value={q.correctAnswer || ''} 
                    onChange={e => updateQuestion(q.id, 'correctAnswer', e.target.value || null)}
                    className="input-field text-sm"
                  >
                    <option value="">-- Not set --</option>
                    {q.options.map((opt, i) => opt.trim() && <option key={i} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4 p-4 card justify-center">
        <button onClick={()=>addQuestion('mcq')} className="btn-ghost border border-[var(--border)]">+ MCQ</button>
        <button onClick={()=>addQuestion('rating')} className="btn-ghost border border-[var(--border)]">+ Rating</button>
        <button onClick={()=>addQuestion('open')} className="btn-ghost border border-[var(--border)]">+ Text</button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-surface)] border-t border-[var(--border)] z-10 flex justify-center shadow-lg">
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full max-w-3xl shadow-xl">{submitting ? 'Creating...' : 'Launch Room'}</button>
      </div>
    </motion.div>
  );
}