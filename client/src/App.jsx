import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateRoom from './pages/CreateRoom';
import HostSession from './pages/HostSession';
import JoinRoom from './pages/JoinRoom';
import ParticipantView from './pages/ParticipantView';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="page-wrapper">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<JoinRoom />} />
            <Route path="/room/:code" element={<ParticipantView />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/rooms/new" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
            <Route path="/session/:code" element={<ProtectedRoute><HostSession /></ProtectedRoute>} />
          </Routes>
        </div>
        <Toaster position="top-center" toastOptions={{
          style: {
            background: '#1E1E38',
            color: '#F1F0FF',
            border: '1px solid rgba(255, 255, 255, 0.07)'
          }
        }}/>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;