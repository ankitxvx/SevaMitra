import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, MapPin, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';

import { API_URL } from '../config';
import { getAllLocalApplications } from '../utils/storage';

export function TrackStatus() {
  const { trackingId: initialTrackingId } = useParams();
  const navigate = useNavigate();
  
  const [trackingId, setTrackingId] = useState(initialTrackingId || '');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async (tid) => {
    if (!tid) return;
    setLoading(true);
    setError('');
    setStatusData(null);
    try {
      const res = await axios.get(`${API_URL}/track-status/${tid}`, { timeout: 3000 });
      setStatusData(res.data);
    } catch (err) {
      console.warn("Backend tracking search failed, checking local sessions:", err.message);
      const all = getAllLocalApplications();
      const match = all.find(a => a.tracking_id === tid || a.session_id === tid);
      if (match) {
        setStatusData({
          form_name: match.form_name,
          status: match.status || 'completed',
          submitted_at: new Date().toISOString().split('T')[0]
        });
      } else {
        setError('Tracking ID not found. Please double-check and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingId) {
      fetchStatus(initialTrackingId);
    }
  }, [initialTrackingId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (trackingId.trim()) {
      navigate(`/track/${trackingId.trim()}`);
      fetchStatus(trackingId.trim());
    }
  };

  return (
    <div className="page-container">
      
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>Application Status Tracker</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Check real-time issuance status of your submitted revenue applications.</p>
      </div>

      <div className="card" style={{ marginBottom: '28px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Enter Tracking ID (e.g. TRK-A1B2C3D4)" 
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
            <Search size={18} /> Search Status
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Retrieving department records...
        </div>
      )}

      {error && (
        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {statusData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="var(--accent)" />
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{statusData.form_name}</span>
            </div>
            <span style={{ 
              padding: '6px 14px', 
              borderRadius: '999px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              background: statusData.status === 'completed' ? 'rgba(16, 163, 127, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: statusData.status === 'completed' ? 'var(--accent)' : 'var(--warning)',
              border: `1px solid ${statusData.status === 'completed' ? 'rgba(16, 163, 127, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              {statusData.status === 'completed' ? 'Verified & Submitted' : statusData.status.replace('_', ' ')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Calendar size={14} /> Submission Date
              </div>
              <div style={{ fontWeight: 600 }}>{statusData.submitted_at}</div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Clock size={14} /> Expected SLA
              </div>
              <div style={{ fontWeight: 600 }}>3 - 5 Working Days</div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <CheckCircle2 size={14} /> Verification Office
              </div>
              <div style={{ fontWeight: 600 }}>Tehsil Revenue Division</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
