import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { DocumentUpload } from './pages/DocumentUpload';
import { PaymentGateway } from './pages/PaymentGateway';
import { TrackStatus } from './pages/TrackStatus';
import { Sparkles, MessageSquarePlus, LayoutDashboard, LogOut, MapPin, UserCheck } from 'lucide-react';
import './index.css';

import { FormReview } from './pages/FormReview';
import { MyApplications } from './pages/MyApplications';
import { FolderCheck } from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('user_id');

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_id');
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>SevaMitraAI</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Revenue Department AI</span>
        </div>
      </div>
      
      {/* Nav Links */}
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
        >
          <MessageSquarePlus size={18} /> 
          <span>New Application</span>
        </Link>

        <Link 
          to="/applications" 
          className={`nav-item ${location.pathname === '/applications' ? 'active' : ''}`}
        >
          <FolderCheck size={18} /> 
          <span>My Filled Forms</span>
        </Link>
        
        <Link 
          to="/track" 
          className={`nav-item ${location.pathname.startsWith('/track') ? 'active' : ''}`}
        >
          <MapPin size={18} /> 
          <span>Track Status</span>
        </Link>
        
        <Link 
          to="/dashboard" 
          className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} /> 
          <span>Dashboard</span>
        </Link>
      </nav>

      {/* Footer Profile / Auth */}
      <div className="sidebar-footer">
        {isLoggedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <UserCheck size={16} color="var(--accent)" />
              <span>+91 {localStorage.getItem('user_id')}</span>
            </div>
            <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <LogOut size={16} color="var(--text-muted)" /> 
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="nav-item">
            <UserCheck size={18} /> 
            <span>Citizen Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/applications" element={<MyApplications />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/review/:sessionId" element={<FormReview />} />
            <Route path="/upload/:sessionId" element={<DocumentUpload />} />
            <Route path="/pay/:sessionId" element={<PaymentGateway />} />
            <Route path="/track" element={<TrackStatus />} />
            <Route path="/track/:trackingId" element={<TrackStatus />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
