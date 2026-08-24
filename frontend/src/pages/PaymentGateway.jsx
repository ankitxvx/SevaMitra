import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, CheckCircle2, QrCode, ArrowRight, Shield } from 'lucide-react';

import { API_URL } from '../config';

export function PaymentGateway() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [trackingId, setTrackingId] = useState('');

  const handlePay = async () => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      
      const res = await axios.post(`${API_URL}/pay`, formData);
      setSuccess(true);
      setTrackingId(res.data.tracking_id);
    } catch (err) {
      console.error(err);
      alert("Payment failed. Please retry.");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid rgba(16, 163, 127, 0.4)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 163, 127, 0.15)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <CheckCircle2 size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>Payment Completed!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Your revenue application has been officially registered with the department.
          </p>
          
          <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Official Tracking ID
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--accent)' }}>
              {trackingId}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Save this ID to check certificate approval status anytime.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/')}>
              New Application
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/track/${trackingId}`)}>
              Track Status <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <CreditCard size={24} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>Government Fee Payment</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Revenue department statutory processing & authentication fee.
        </p>

        <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Service Application Fee:</span>
            <span>₹120.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>e-District Portal Charges:</span>
            <span>₹30.00</span>
          </div>
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '10px 0' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
            <span>Total Payable:</span>
            <span>₹150.00</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handlePay}
            disabled={processing}
            style={{ width: '100%', padding: '12px' }}
          >
            {processing ? "Simulating Bank Gateway..." : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <QrCode size={18} /> Pay ₹150 via UPI / Card (Demo)
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          <Shield size={14} /> 256-bit encrypted secure government payment gateway
        </div>

      </div>
    </div>
  );
}
