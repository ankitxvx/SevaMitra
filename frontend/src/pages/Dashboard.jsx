import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileText, CheckCircle, IndianRupee, RefreshCw } from 'lucide-react';

import { API_URL } from '../config';

export function Dashboard() {
  const [stats, setStats] = useState({
    total_forms: 0,
    completed: 0,
    pending: 0,
    revenue: 0,
    recent_forms: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(res.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Operational Metrics...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>Operational Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time revenue department voice processing & application flow statistics</p>
        </div>
        <button className="btn btn-secondary" onClick={handleManualRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid">
        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <FileText size={18} />
            <span>Total Applications</span>
          </div>
          <span className="stat-value">{stats.total_forms}</span>
        </div>
        
        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)', fontSize: '0.85rem' }}>
            <CheckCircle size={18} />
            <span>Completed & Paid</span>
          </div>
          <span className="stat-value" style={{ color: 'var(--accent)' }}>{stats.completed}</span>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--warning)', fontSize: '0.85rem' }}>
            <Users size={18} />
            <span>In Progress / Pending</span>
          </div>
          <span className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</span>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a78bfa', fontSize: '0.85rem' }}>
            <IndianRupee size={18} />
            <span>Revenue Collected</span>
          </div>
          <span className="stat-value" style={{ color: '#a78bfa' }}>₹ {stats.revenue}</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Recent Citizen Submissions</h3>
        
        {stats.recent_forms && stats.recent_forms.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Certificate / Service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_forms.map(form => (
                  <tr key={form.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {form.session_id ? form.session_id.substring(0, 8) : 'N/A'}...
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {form.form_name || 'Incomplete Setup'}
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: form.status === 'completed' ? 'rgba(16, 163, 127, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: form.status === 'completed' ? 'var(--accent)' : 'var(--warning)',
                        border: `1px solid ${form.status === 'completed' ? 'rgba(16, 163, 127, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        {form.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No submissions recorded yet. Start a new form to see live telemetry!
          </div>
        )}
      </div>

    </div>
  );
}
