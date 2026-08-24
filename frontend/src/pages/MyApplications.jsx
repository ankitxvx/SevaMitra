import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, CheckCircle2, Clock, Eye, ArrowRight, PlusCircle, AlertCircle, Shield } from 'lucide-react';

import { API_URL } from '../config';

export function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API_URL}/applications`);
      setApplications(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: '999px', 
            fontSize: '0.8rem', 
            fontWeight: 600,
            background: 'rgba(16, 163, 127, 0.15)',
            color: 'var(--accent)',
            border: '1px solid rgba(16, 163, 127, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={13} /> Submitted & Paid
          </span>
        );
      case 'pending_payment':
        return (
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: '999px', 
            fontSize: '0.8rem', 
            fontWeight: 600,
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Clock size={13} /> Payment Pending
          </span>
        );
      case 'pending_docs':
        return (
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: '999px', 
            fontSize: '0.8rem', 
            fontWeight: 600,
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--warning)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={13} /> Document Upload Pending
          </span>
        );
      default:
        return (
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: '999px', 
            fontSize: '0.8rem', 
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Clock size={13} /> In Progress
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your filled applications...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>My Filled Applications</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            View, review, or continue your revenue department forms and certificates.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <PlusCircle size={16} /> New Application
        </button>
      </div>

      {/* Applications List */}
      {applications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => {
            const responseKeys = Object.keys(app.responses || {});
            
            return (
              <div key={app.id || app.session_id} className="card" style={{ padding: '24px', transition: 'border-color 0.2s' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 163, 127, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{app.form_name}</h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Session: {app.session_id.substring(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Captured Details Preview */}
                {responseKeys.length > 0 ? (
                  <div style={{ background: 'var(--bg-input)', padding: '14px 18px', borderRadius: '8px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                      Captured Fields Summary ({responseKeys.length} / {app.total_questions || responseKeys.length} questions completed):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      {responseKeys.slice(0, 4).map((q, idx) => (
                        <div key={idx} style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{q.substring(0, 24)}...: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{app.responses[q]}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Form initiated, questions pending.
                  </div>
                )}

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  {app.tracking_id ? (
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tracking ID: </span>
                      <strong style={{ color: 'var(--accent)', letterSpacing: '1px' }}>{app.tracking_id}</strong>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} /> Departmental verification pending
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      onClick={() => navigate(`/review/${app.session_id}`)}
                    >
                      <Eye size={15} /> View / Edit Filled Form
                    </button>

                    {app.status === 'pending_docs' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => navigate(`/upload/${app.session_id}`)}
                      >
                        Upload Documents <ArrowRight size={14} />
                      </button>
                    )}

                    {app.status === 'pending_payment' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => navigate(`/pay/${app.session_id}`)}
                      >
                        Pay Fee <ArrowRight size={14} />
                      </button>
                    )}

                    {app.tracking_id && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => navigate(`/track/${app.tracking_id}`)}
                      >
                        Track Status <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Filled Forms Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px auto' }}>
            Start a voice conversation to apply for Income, Caste, Domicile or Solvency certificates.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            <PlusCircle size={16} /> Start Application with Voice Assistant
          </button>
        </div>
      )}

    </div>
  );
}
