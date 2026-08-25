import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CreditCard, CheckCircle2, QrCode, ArrowRight, Shield,
  Smartphone, Globe, Wifi, XCircle, RefreshCw, Volume2,
  Lock, Zap, AlertTriangle
} from 'lucide-react';

import { API_URL } from '../config';
import { getLocalSession, saveLocalSession } from '../utils/storage';

// ─────────────────────────────────────────────
// Payment method tabs (visual only, all demo)
// ─────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'upi',  label: 'UPI',        icon: Smartphone },
  { id: 'card', label: 'Card',       icon: CreditCard },
  { id: 'net',  label: 'Net Banking', icon: Globe     },
];

// ─────────────────────────────────────────────
// Processing stages
// ─────────────────────────────────────────────
const STAGES = [
  { id: 'connecting',  label: 'Connecting to Payment Gateway...' },
  { id: 'verifying',   label: 'Verifying with Bank...'           },
  { id: 'confirming',  label: 'Confirming Transaction...'        },
];

// ─────────────────────────────────────────────
// TTS helper (standalone, no hooks needed)
// ─────────────────────────────────────────────
const speakPayment = (text, lang = 'hi-IN') => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.92;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
  if (match) utterance.voice = match;
  window.speechSynthesis.speak(utterance);
};

// ─────────────────────────────────────────────
// Payment texts per language
// ─────────────────────────────────────────────
const PAYMENT_SPEECH = {
  'hi-IN': {
    announce:  (amt) => `आपकी कुल फीस ₹${amt} है। कृपया Pay Now दबाएं।`,
    success:   (amt, id) => `₹${amt} का भुगतान स्वीकार कर लिया गया। आपकी ट्रैकिंग आईडी है ${id.split('').join(' ')}। इसे नोट कर लें।`,
    declined:  `भुगतान अस्वीकार कर दिया गया। कृपया पुनः प्रयास करें।`,
  },
  'en-IN': {
    announce:  (amt) => `Your total fee is ₹${amt}. Please click Pay Now to proceed.`,
    success:   (amt, id) => `Payment of ₹${amt} accepted! Your tracking ID is ${id}. Please note it down.`,
    declined:  `Payment was declined. Please try again.`,
  },
  'mr-IN': {
    announce:  (amt) => `आपले एकूण शुल्क ₹${amt} आहे. Pay Now दाबा.`,
    success:   (amt, id) => `₹${amt} चे पेमेंट स्वीकारले. ट्रॅकिंग आयडी ${id} आहे. नोंद घ्या.`,
    declined:  `पेमेंट नाकारले. कृपया पुन्हा प्रयत्न करा.`,
  },
  'ta-IN': {
    announce:  (amt) => `உங்கள் மொத்த கட்டணம் ₹${amt}. Pay Now கிளிக் செய்யவும்.`,
    success:   (amt, id) => `₹${amt} கட்டணம் ஏற்றுக்கொள்ளப்பட்டது. கண்காணிப்பு ID: ${id}.`,
    declined:  `கட்டணம் நிராகரிக்கப்பட்டது. மீண்டும் முயற்சிக்கவும்.`,
  },
  'te-IN': {
    announce:  (amt) => `మీ మొత్తం ఫీజు ₹${amt}. Pay Now నొక్కండి.`,
    success:   (amt, id) => `₹${amt} చెల్లింపు అంగీకరించబడింది. ట్రాకింగ్ ID: ${id}.`,
    declined:  `చెల్లింపు తిరస్కరించబడింది. మళ్ళీ ప్రయత్నించండి.`,
  },
  'bn-IN': {
    announce:  (amt) => `আপনার মোট ফি ₹${amt}। Pay Now ক্লিক করুন।`,
    success:   (amt, id) => `₹${amt} পেমেন্ট গৃহীত হয়েছে। ট্র্যাকিং আইডি: ${id}।`,
    declined:  `পেমেন্ট প্রত্যাখ্যাত হয়েছে। আবার চেষ্টা করুন।`,
  },
  'gu-IN': {
    announce:  (amt) => `તમારી કુલ ફી ₹${amt} છે. Pay Now દબાવો.`,
    success:   (amt, id) => `₹${amt} ચુકવણી સ્વીકૃત. ટ્રેકિંગ ID: ${id}.`,
    declined:  `ચુકવણી અસ્વીકાર. ફરીથી પ્રયાસ કરો.`,
  },
};

// ─────────────────────────────────────────────
export function PaymentGateway() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Get selected language from session (if stored), else default
  const sessionData = getLocalSession(sessionId) || {};
  const lang = sessionData.lang || 'hi-IN';
  const speech = PAYMENT_SPEECH[lang] || PAYMENT_SPEECH['en-IN'];

  const AMOUNT = 150;

  const [activeMethod, setActiveMethod] = useState('upi');
  const [processing, setProcessing]   = useState(false);
  const [stageIndex, setStageIndex]   = useState(-1); // -1 = not started
  const [result, setResult]           = useState(null); // 'success' | 'declined'
  const [trackingId, setTrackingId]   = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const stageTimerRef = useRef(null);

  // ── Announce amount on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (voiceEnabled) speakPayment(speech.announce(AMOUNT), lang);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line
  }, []);

  const runStages = useCallback(async () => {
    setProcessing(true);
    setStageIndex(0);

    await new Promise(r => setTimeout(r, 1400));
    setStageIndex(1);
    await new Promise(r => setTimeout(r, 1400));
    setStageIndex(2);
    await new Promise(r => setTimeout(r, 1400));

    // ── 10% chance of decline for realism
    const declined = Math.random() < 0.1;
    setProcessing(false);

    if (declined) {
      setResult('declined');
      if (voiceEnabled) speakPayment(speech.declined, lang);
      setStageIndex(-1);
      return;
    }

    // ── Success path
    let generatedTrk;
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      const res = await axios.post(`${API_URL}/pay`, formData, { timeout: 4000 });
      generatedTrk = res.data.tracking_id;
    } catch {
      generatedTrk = `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }

    const saved = getLocalSession(sessionId) || {};
    saveLocalSession(sessionId, { ...saved, status: 'completed', tracking_id: generatedTrk, paid_amount: AMOUNT });

    setTrackingId(generatedTrk);
    setResult('success');

    if (voiceEnabled) {
      setTimeout(() => speakPayment(speech.success(AMOUNT, generatedTrk), lang), 300);
    }
  }, [sessionId, voiceEnabled, lang, speech]);

  // ── DECLINED screen
  if (result === 'declined') {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', border: '1px solid rgba(239,68,68,0.4)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <XCircle size={34} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px', color: '#f87171' }}>Payment Declined</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Your bank declined this transaction. This could be due to insufficient funds or bank-side limits.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { setResult(null); setStageIndex(-1); }}
            >
              <RefreshCw size={16} /> Try Again
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>
              New Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS screen
  if (result === 'success') {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid rgba(16,163,127,0.4)' }}>

          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,163,127,0.15)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>Payment Accepted! ✅</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
            ₹{AMOUNT}.00 — Government fee paid successfully.
          </p>

          {/* Amount confirmation badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'rgba(16,163,127,0.12)', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '24px' }}>
            <Zap size={16} /> ₹{AMOUNT} Paid via {PAYMENT_METHODS.find(m => m.id === activeMethod)?.label || 'UPI'}
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Official Tracking ID
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--accent)' }}>
              {trackingId}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Save this ID to check certificate approval status anytime.
            </div>
          </div>

          {/* Voice replay button */}
          <button
            onClick={() => speakPayment(speech.success(AMOUNT, trackingId), lang)}
            style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontFamily: 'inherit' }}
          >
            <Volume2 size={14} /> Replay Voice Confirmation
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/')}>New Application</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/track/${trackingId}`)}>
              Track Status <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Main payment page
  // ─────────────────────────────────────────────
  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '80vh', paddingTop: '40px' }}>
      <div className="card" style={{ maxWidth: '460px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', color: '#818cf8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '4px' }}>Government Fee Payment</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Revenue department statutory processing & authentication fee
          </p>
        </div>

        {/* Voice announce button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => {
              setVoiceEnabled(v => !v);
              speakPayment(speech.announce(AMOUNT), lang);
            }}
            style={{ background: voiceEnabled ? 'rgba(16,163,127,0.12)' : 'var(--bg-input)', border: `1px solid ${voiceEnabled ? 'rgba(16,163,127,0.35)' : 'var(--border-color)'}`, borderRadius: '999px', color: voiceEnabled ? 'var(--accent)' : 'var(--text-secondary)', padding: '7px 16px', cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
          >
            <Volume2 size={14} />
            {voiceEnabled ? 'Voice: ON — Click to hear amount' : 'Voice: OFF — Click to enable'}
          </button>
        </div>

        {/* Payment Method Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {PAYMENT_METHODS.map(method => {
            const Icon = method.icon;
            const active = activeMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setActiveMethod(method.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '10px', border: `1px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`,
                  background: active ? 'rgba(16,163,127,0.1)' : 'var(--bg-input)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 700 : 500,
                  fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={18} />
                {method.label}
              </button>
            );
          })}
        </div>

        {/* UPI demo field */}
        {activeMethod === 'upi' && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>UPI ID (Demo)</div>
            <input
              type="text"
              readOnly
              value="citizen@sevamitra"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'monospace', cursor: 'not-allowed' }}
            />
          </div>
        )}

        {/* Card demo fields */}
        {activeMethod === 'card' && (
          <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" readOnly value="•••• •••• •••• 4242" placeholder="Card Number"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" readOnly value="12/28" placeholder="MM/YY"
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
              <input type="text" readOnly value="•••" placeholder="CVV"
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
            </div>
          </div>
        )}

        {/* Net Banking demo */}
        {activeMethod === 'net' && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Select Bank (Demo)</div>
            <select style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit' }}>
              <option>State Bank of India</option>
              <option>HDFC Bank</option>
              <option>ICICI Bank</option>
              <option>Bank of Baroda</option>
            </select>
          </div>
        )}

        {/* Fee Breakdown */}
        <div style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Service Application Fee:</span>
            <span>₹120.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>e-District Portal Charges:</span>
            <span>₹30.00</span>
          </div>
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0 12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
            <span>Total Payable:</span>
            <span>₹150.00</span>
          </div>
        </div>

        {/* Processing stages UI */}
        {processing && (
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(59,130,246,0.07)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
            {STAGES.map((stage, idx) => {
              const status = idx < stageIndex ? 'done' : idx === stageIndex ? 'active' : 'pending';
              return (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', fontSize: '0.85rem' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: status === 'done' ? 'var(--accent)' : status === 'active' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)',
                    border: status === 'active' ? '2px solid #3b82f6' : '2px solid transparent',
                    fontSize: '0.7rem', color: 'white',
                    animation: status === 'active' ? 'pulseMic 1.2s infinite' : 'none',
                  }}>
                    {status === 'done' ? '✓' : status === 'active' ? <Wifi size={10} /> : ''}
                  </div>
                  <span style={{ color: status === 'pending' ? 'var(--text-muted)' : status === 'active' ? '#93c5fd' : 'var(--accent)', fontWeight: status === 'active' ? 600 : 400 }}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pay button */}
        <button
          className="btn btn-primary"
          onClick={runStages}
          disabled={processing}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', background: processing ? 'var(--accent-hover)' : 'var(--accent)' }}
        >
          {processing ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              Processing...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <QrCode size={20} /> Pay ₹150 via {PAYMENT_METHODS.find(m => m.id === activeMethod)?.label} (Demo)
            </span>
          )}
        </button>

        {/* Security footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Shield size={13} /> 256-bit encrypted secure government payment gateway
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <AlertTriangle size={12} color="var(--warning)" /> Demo mode — No real charges
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
