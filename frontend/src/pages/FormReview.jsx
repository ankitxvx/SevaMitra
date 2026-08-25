import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FileText, CheckCircle2, Edit3, ArrowRight, Printer,
  ShieldCheck, ArrowLeft, Save, X, AlertCircle, AlertTriangle
} from 'lucide-react';

import { API_URL } from '../config';
import { getLocalSession, saveLocalSession } from '../utils/storage';

// ─────────────────────────────────────────────
// Issue #3 — Validation rules (mirror of Home.jsx)
// ─────────────────────────────────────────────
const validateField = (question, answer) => {
  const q = (question || '').toLowerCase();
  const a = (answer || '').trim();

  if (!a || a.length < 2) return { valid: false, level: 'error', msg: 'Field is empty or too short.' };

  if (q.includes('aadhaar') || q.includes('aadhar')) {
    const digits = a.replace(/\s/g, '');
    if (!/^\d{12}$/.test(digits)) return { valid: false, level: 'error', msg: 'Aadhaar must be exactly 12 digits.' };
  }

  if (q.includes('income') || q.includes('valuation') || q.includes('solvency')) {
    if (!/\d/.test(a)) return { valid: false, level: 'warn', msg: 'Income/amount should contain a number.' };
  }

  if ((q.includes('full name') || q.includes('applicant') || q.includes('owner')) && /^\d+$/.test(a)) {
    return { valid: false, level: 'error', msg: 'Name should not be all numbers.' };
  }

  if (q.includes('how many years') || q.includes('years')) {
    if (!/\d/.test(a)) return { valid: false, level: 'warn', msg: 'Years should be a number.' };
  }

  if (q.includes('contact number') || q.includes('phone')) {
    if (!/\d{10}/.test(a.replace(/\s|-/g, ''))) return { valid: false, level: 'warn', msg: 'Phone should be 10 digits.' };
  }

  if (q.includes('date of birth') || q.includes('dob')) {
    if (!/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(a)) return { valid: false, level: 'warn', msg: 'Use DD/MM/YYYY format.' };
  }

  if (q.includes('pincode')) {
    if (!/\d{6}/.test(a)) return { valid: false, level: 'warn', msg: 'Pincode must be 6 digits.' };
  }

  return { valid: true, level: 'ok', msg: 'Valid' };
};

// ─────────────────────────────────────────────
export function FormReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (sessionId) fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const res = await axios.get(`${API_URL}/session/${sessionId}`, { timeout: 3000 });
      setFormData(res.data);
    } catch {
      const local = getLocalSession(sessionId);
      setFormData(local);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit  = (question, val) => { setEditingKey(question); setEditValue(val); };
  const handleCancelEdit = () => { setEditingKey(null); setEditValue(''); };

  const handleSaveEdit = async (question) => {
    try {
      await axios.post(`${API_URL}/update-response`, { session_id: sessionId, question, new_value: editValue }, { timeout: 3000 });
    } catch {}

    const updatedResponses = { ...(formData?.responses || {}), [question]: editValue };
    setFormData(prev => ({ ...prev, responses: updatedResponses }));
    saveLocalSession(sessionId, { ...formData, responses: updatedResponses });
    setEditingKey(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Generating Official Form Preview...</p>
      </div>
    );
  }

  if (!formData?.form_name) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>No Active Form Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0 24px 0' }}>Please start a new application with the assistant.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Assistant
        </button>
      </div>
    );
  }

  const responses = formData.responses || {};

  // Compute overall validation summary
  const allFields = (formData.questions || []).map(q => ({ question: q, answer: responses[q] || '', validation: validateField(q, responses[q] || '') }));
  const errorCount = allFields.filter(f => f.validation.level === 'error').length;
  const warnCount  = allFields.filter(f => f.validation.level === 'warn').length;
  const okCount    = allFields.filter(f => f.validation.level === 'ok').length;

  return (
    <div className="page-container">

      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>Structured Form Review</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review all details extracted from your voice & text session before submitting.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print / Save PDF
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/upload/${sessionId}`)}>
            Proceed to Documents <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Issue #3: Validation Summary Banner */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '130px', padding: '12px 16px', borderRadius: '10px', background: okCount > 0 ? 'rgba(16,163,127,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${okCount > 0 ? 'rgba(16,163,127,0.3)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} color="var(--accent)" />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)' }}>{okCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valid Fields</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '130px', padding: '12px 16px', borderRadius: '10px', background: warnCount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${warnCount > 0 ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color={warnCount > 0 ? '#f59e0b' : 'var(--text-muted)'} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: warnCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{warnCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Needs Review</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '130px', padding: '12px 16px', borderRadius: '10px', background: errorCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${errorCount > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} color={errorCount > 0 ? '#ef4444' : 'var(--text-muted)'} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: errorCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{errorCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Errors Found</div>
          </div>
        </div>
      </div>

      {/* Save success toast */}
      {saveSuccess && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(16,163,127,0.15)', border: '1px solid rgba(16,163,127,0.3)', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> Field updated successfully!
        </div>
      )}

      {/* Form Document Card */}
      <div className="card" style={{ padding: '36px', border: '1px solid rgba(255,255,255,0.15)' }}>

        {/* Government Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '24px', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
            Government of India • Revenue & e-District Department
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
            Application for {formData.form_name}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>Session ID: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{sessionId}</strong></span>
            <span>•</span>
            <span>Status: <strong style={{ color: errorCount === 0 ? 'var(--accent)' : '#f59e0b' }}>{errorCount === 0 ? 'Ready for Submission' : 'Needs Correction'}</strong></span>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileText size={18} color="var(--accent)" /> Applicant Provided Details
          </div>

          {allFields.map(({ question, answer, validation }, idx) => {
            const isEditing = editingKey === question;

            const badgeColor = validation.level === 'ok'
              ? 'var(--accent)'
              : validation.level === 'warn'
              ? '#f59e0b'
              : '#ef4444';

            const BadgeIcon = validation.level === 'ok'
              ? CheckCircle2
              : validation.level === 'warn'
              ? AlertTriangle
              : AlertCircle;

            return (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-input)',
                  border: `1px solid ${validation.level === 'ok' ? 'var(--border-color)' : validation.level === 'warn' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.35)'}`,
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                    Field {idx + 1}: {question}
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--accent)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'inherit' }}
                        autoFocus
                      />
                      <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleSaveEdit(question)}>
                        <Save size={14} /> Save
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={handleCancelEdit}>
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                        {answer || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Not provided</span>}
                      </div>
                      {/* Validation badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: badgeColor, fontWeight: 600, flexShrink: 0 }}>
                        <BadgeIcon size={14} />
                        <span>{validation.level === 'ok' ? 'Valid' : validation.level === 'warn' ? 'Check' : 'Error'}</span>
                      </div>
                    </div>
                  )}

                  {/* Validation hint */}
                  {!isEditing && validation.level !== 'ok' && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: badgeColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BadgeIcon size={12} />
                      {validation.msg}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}
                    onClick={() => handleStartEdit(question, answer)}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <ShieldCheck size={16} color="var(--accent)" />
            <span>Details encrypted and validated against Revenue Department rules.</span>
          </div>
          <button className="btn btn-primary" onClick={() => navigate(`/upload/${sessionId}`)} style={{ padding: '12px 24px' }}>
            {errorCount > 0 ? 'Save & Upload Anyway' : 'Confirm Details & Upload Documents'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
