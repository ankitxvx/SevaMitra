import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, ShieldCheck, ArrowRight } from 'lucide-react';

import { API_URL } from '../config';

export function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone, otp
  const navigate = useNavigate();

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setStep('otp');
    } else {
      alert("Please enter a valid 10-digit mobile number");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { phone });
      localStorage.setItem('user_token', res.data.token);
      localStorage.setItem('user_id', res.data.user_id);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Login failed. Please check your backend.");
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 163, 127, 0.15)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <ShieldCheck size={26} />
        </div>
        
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>Citizen Authentication</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Sign in via mobile OTP to access government citizen certificates.
        </p>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="tel" 
              placeholder="Enter 10-digit Mobile Number" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-input)', 
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Send OTP <ArrowRight size={16} />
              </span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              OTP sent to +91 {phone} (Demo OTP: Any 4 digits)
            </div>
            <input 
              type="text" 
              placeholder="Enter 4-digit OTP (e.g. 1234)" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-input)', 
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Verify & Login <LogIn size={16} />
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
