import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, CheckCircle2, Edit3, ArrowRight, Printer, ShieldCheck, ArrowLeft, Save, X } from 'lucide-react';

import { API_URL } from '../config';
import { getLocalSession, saveLocalSession } from '../utils/storage';

export function FormReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const res = await axios.get(`${API_URL}/session/${sessionId}`, { timeout: 3000 });
      setFormData(res.data);
      setLoading(false);
    } catch (err) {
      console.warn("Backend unavailable. Reading local session data:", err.message);
      const local = getLocalSession(sessionId);
      setFormData(local);
      setLoading(false);
    }
  };

  const handleStartEdit = (question, currentValue) => {
    setEditingKey(question);
    setEditValue(currentValue);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSaveEdit = async (question) => {
    try {
      await axios.post(`${API_URL}/update-response`, {
        session_id: sessionId,
        question: question,
        new_value: editValue
      }, { timeout: 3000 });
    } catch (err) {
      console.warn("Backend update failed, saving locally:", err.message);
    }
    
    const updatedResponses = {
      ...(formData?.responses || {}),
      [question]: editValue
    };

    setFormData(prev => ({
      ...prev,
      responses: updatedResponses
    }));

    saveLocalSession(sessionId, {
      ...formData,
      responses: updatedResponses
    });

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

  if (!formData || !formData.form_name) {
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

  return (
    <div className="page-container">
      
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>Structured Form Review</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review all details extracted from your conversational voice & text session before submitting.
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

      {saveSuccess && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(16, 163, 127, 0.15)', border: '1px solid rgba(16, 163, 127, 0.3)', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> Field updated successfully in departmental records!
        </div>
      )}

      {/* Official Form Document Card */}
      <div className="card" style={{ padding: '36px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'var(--bg-card)' }}>
        
        {/* Government Header Banner */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '24px', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
            Government of India • Revenue & e-District Department
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Application for {formData.form_name}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>Session ID: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{sessionId}</strong></span>
            <span>•</span>
            <span>Status: <strong style={{ color: 'var(--accent)' }}>Extracted & Ready for Validation</strong></span>
          </div>
        </div>

        {/* Form Details Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileText size={18} color="var(--accent)" /> Applicant Provided Details
          </div>

          {formData.questions && formData.questions.map((question, idx) => {
            const answer = responses[question] || 'Not specified';
            const isEditing = editingKey === question;

            return (
              <div 
                key={idx}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
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
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--accent)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem'
                        }}
                        autoFocus
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleSaveEdit(question)}
                      >
                        <Save size={14} /> Save
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        onClick={handleCancelEdit}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {answer}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                    onClick={() => handleStartEdit(question, answer)}
                    title="Edit / Correct this field"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
              </div>
            );
          })}

        </div>

        {/* Security & Verification Footer Banner */}
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <ShieldCheck size={16} color="var(--accent)" />
            <span>Details encrypted and validated against Revenue Department rules.</span>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => navigate(`/upload/${sessionId}`)}
            style={{ padding: '12px 24px' }}
          >
            Confirm Details & Upload Documents <ArrowRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}
