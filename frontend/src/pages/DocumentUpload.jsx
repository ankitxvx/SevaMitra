import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UploadCloud, CheckCircle2, FileUp, ArrowRight, ShieldCheck } from 'lucide-react';

import { API_URL } from '../config';

export function DocumentUpload() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !sessionId) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('document_type', 'ID_PROOF');
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/upload-document`, formData);
      if (res.data.status === 'pending_payment') {
        navigate(`/pay/${sessionId}`);
      } else {
        alert("Document uploaded successfully.");
        setFile(null);
        setUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please check backend connection.");
      setUploading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 163, 127, 0.1)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <FileUp size={24} />
        </div>
        
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Document Verification</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Please upload your supporting ID document (Aadhaar Card, Voter ID, or Ration Card) for automated validation.
        </p>

        <div 
          style={{ 
            border: '2px dashed var(--border-color)', 
            padding: '36px 20px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            backgroundColor: 'var(--bg-input)',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease'
          }}
          onClick={() => document.getElementById('doc-upload').click()}
        >
          <input 
            type="file" 
            id="doc-upload" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            accept="image/*,.pdf"
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {file ? (
              <CheckCircle2 size={36} color="var(--accent)" />
            ) : (
              <UploadCloud size={36} color="var(--text-secondary)" />
            )}
            
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: file ? 'var(--accent)' : 'var(--text-primary)' }}>
              {file ? file.name : "Click or Drag & Drop file here"}
            </div>
            
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Supports PDF, PNG, JPG up to 10MB
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
          <ShieldCheck size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span>Local document processing complies with government privacy standards.</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate(`/review/${sessionId}`)}
            style={{ flex: 1, padding: '12px' }}
          >
            Review Filled Form
          </button>
          
          <button 
            className="btn btn-primary" 
            disabled={!file || uploading} 
            onClick={handleUpload}
            style={{ flex: 2, padding: '12px' }}
          >
            {uploading ? "Verifying with OCR..." : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Upload & Pay <ArrowRight size={16} />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
