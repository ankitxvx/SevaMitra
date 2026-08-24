import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { DocumentUpload } from './pages/DocumentUpload';
import { PaymentGateway } from './pages/PaymentGateway';
import { TrackStatus } from './pages/TrackStatus';
import { FormReview } from './pages/FormReview';
import { MyApplications } from './pages/MyApplications';
import { 
  Sparkles, MessageSquarePlus, LayoutDashboard, LogOut, 
  MapPin, UserCheck, FolderCheck, Menu, X 
} from 'lucide-react';
import './index.css';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('user_id');

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_id');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>SevaMitraAI</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Revenue Department AI</span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button 
            className="mobile-close-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
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
    </>
  );
}

function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Top App Bar */}
      <header className="mobile-header">
        <button 
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="sidebar-logo-icon" style={{ width: '28px', height: '28px' }}>
            <Sparkles size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>SevaMitraAI</span>
        </div>

        <Link to="/applications" className="mobile-quick-link" title="My Applications">
          <FolderCheck size={20} color="var(--text-secondary)" />
        </Link>
      </header>

      {/* Responsive Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      {/* Content Container */}
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
  );
}

function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}

export default App;
