import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-[rgba(255,255,255,0.07)] bg-[#16162A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>
            RoomPoll<span className="text-[var(--accent)]">.</span>
          </Link>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-ghost">Dashboard</Link>
                <button onClick={handleLogout} className="btn-ghost text-[#9B99C4]">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Host Login</Link>
                <Link to="/join" className="btn-secondary py-2 px-4">Join Room</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}