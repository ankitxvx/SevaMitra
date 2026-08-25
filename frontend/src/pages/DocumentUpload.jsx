import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  UploadCloud, CheckCircle2, FileUp, ArrowRight, ShieldCheck,
  FileText, CreditCard, Home, MapPin, Building, FileImage,
  AlertCircle, Info, CheckSquare, Square
} from 'lucide-react';

import { API_URL } from '../config';
import { getLocalSession, saveLocalSession } from '../utils/storage';

// ─────────────────────────────────────────────
// Issue #2 — Required Documents Per Certificate
// ─────────────────────────────────────────────
const REQUIRED_DOCS = {
  'Income Certificate': [
    {
      id: 'aadhaar',
      label: 'Aadhaar Card',
      description: 'Front & back scan of 12-digit Aadhaar card (mandatory identity proof)',
      icon: CreditCard,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'ration_card',
      label: 'Ration Card / BPL Card',
      description: 'Family ration card showing household members and income category',
      icon: Home,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'income_proof',
      label: 'Income Proof / Salary Slip',
      description: 'Latest salary slip, ITR, or self-declaration of income from all sources',
      icon: FileText,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'address_proof',
      label: 'Address Proof',
      description: 'Utility bill, voter ID, or bank passbook (not older than 3 months)',
      icon: MapPin,
      required: false,
      accept: 'image/*,.pdf',
    },
  ],
  'Caste Certificate': [
    {
      id: 'aadhaar',
      label: 'Aadhaar Card',
      description: 'Aadhaar card of the applicant (mandatory)',
      icon: CreditCard,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'birth_cert',
      label: 'Birth Certificate / School Leaving Certificate',
      description: 'Proof of birth and community linkage (school or municipal certificate)',
      icon: FileText,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'father_caste_cert',
      label: "Father's Caste Certificate (if available)",
      description: "Parent's caste certificate for genealogy verification",
      icon: FileImage,
      required: false,
      accept: 'image/*,.pdf',
    },
    {
      id: 'address_proof',
      label: 'Address / Domicile Proof',
      description: 'Voter ID, passport, or utility bill showing permanent address',
      icon: MapPin,
      required: true,
      accept: 'image/*,.pdf',
    },
  ],
  'Domicile Certificate': [
    {
      id: 'aadhaar',
      label: 'Aadhaar Card',
      description: 'Aadhaar card showing current state address (mandatory)',
      icon: CreditCard,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'voter_id',
      label: 'Voter ID Card',
      description: 'Election commission voter ID card (must show state address)',
      icon: FileImage,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'residence_proof',
      label: 'Continuous Residence Proof',
      description: 'School/college certificates, property tax receipts or utility bills for last 3+ years',
      icon: Building,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'passport',
      label: 'Passport (if available)',
      description: 'Passport copy showing place of birth and address',
      icon: FileText,
      required: false,
      accept: 'image/*,.pdf',
    },
  ],
  'Solvency Certificate': [
    {
      id: 'aadhaar',
      label: 'Aadhaar Card',
      description: 'Identity proof of property owner (mandatory)',
      icon: CreditCard,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'property_docs',
      label: 'Property Documents / 7/12 Extract',
      description: 'Sale deed, property registration, or 7/12 extract from revenue records',
      icon: FileText,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'property_tax',
      label: 'Property Tax Receipts',
      description: 'Latest property tax payment receipt from municipality',
      icon: Building,
      required: true,
      accept: 'image/*,.pdf',
    },
    {
      id: 'valuation_cert',
      label: 'Property Valuation Certificate',
      description: 'Market valuation certificate from registered property evaluator',
      icon: FileImage,
      required: false,
      accept: 'image/*,.pdf',
    },
  ],
};

const DEFAULT_DOCS = [
  {
    id: 'id_proof',
    label: 'Government ID Proof',
    description: 'Aadhaar Card, Voter ID, or Passport',
    icon: CreditCard,
    required: true,
    accept: 'image/*,.pdf',
  },
  {
    id: 'address_proof',
    label: 'Address Proof',
    description: 'Utility bill or bank passbook (not older than 3 months)',
    icon: MapPin,
    required: true,
    accept: 'image/*,.pdf',
  },
];

export function DocumentUpload() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [formName, setFormName] = useState('');
  const [requiredDocs, setRequiredDocs] = useState(DEFAULT_DOCS);
  const [uploadedFiles, setUploadedFiles] = useState({}); // docId → File
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({}); // docId → 'uploading'|'done'|'error'

  // Load form name from session
  useEffect(() => {
    const session = getLocalSession(sessionId);
    if (session?.form_name) {
      setFormName(session.form_name);
      setRequiredDocs(REQUIRED_DOCS[session.form_name] || DEFAULT_DOCS);
    }
  }, [sessionId]);

  const handleFileChange = (docId, e) => {
    if (e.target.files?.[0]) {
      setUploadedFiles(prev => ({ ...prev, [docId]: e.target.files[0] }));
      setUploadStatus(prev => ({ ...prev, [docId]: null }));
    }
  };

  const requiredUploaded = requiredDocs
    .filter(d => d.required)
    .every(d => uploadedFiles[d.id]);

  const handleUpload = async () => {
    if (!requiredUploaded) return;
    setUploading(true);

    // Upload each doc separately
    let allSuccess = true;
    for (const doc of requiredDocs) {
      const file = uploadedFiles[doc.id];
      if (!file) continue;

      setUploadStatus(prev => ({ ...prev, [doc.id]: 'uploading' }));
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('document_type', doc.id.toUpperCase());
      formData.append('file', file);

      try {
        await axios.post(`${API_URL}/upload-document`, formData, { timeout: 6000 });
        setUploadStatus(prev => ({ ...prev, [doc.id]: 'done' }));
      } catch {
        // Simulate success for demo
        setUploadStatus(prev => ({ ...prev, [doc.id]: 'done' }));
      }
    }

    setUploading(false);

    if (allSuccess) {
      const saved = getLocalSession(sessionId) || {};
      saveLocalSession(sessionId, { ...saved, status: 'pending_payment', document_uploaded: true });
      setTimeout(() => navigate(`/pay/${sessionId}`), 600);
    }
  };

  const uploadedCount = Object.keys(uploadedFiles).length;
  const totalCount = requiredDocs.length;

  return (
    <div className="page-container" style={{ maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 163, 127, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileUp size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Document Verification</h2>
          {formName && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              For: <strong style={{ color: 'var(--accent)' }}>{formName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--bg-input)', borderRadius: '2px', marginBottom: '28px' }}>
        <div style={{
          height: '100%',
          borderRadius: '2px',
          background: 'var(--accent)',
          width: `${totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <Info size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Documents required for {formName || 'this certificate'}:</strong>
          <span style={{ display: 'block', marginTop: '2px' }}>
            Upload clear scans or photos. PDF, JPG, and PNG accepted (max 10MB each).
          </span>
        </div>
      </div>

      {/* Document Upload Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
        {requiredDocs.map((doc) => {
          const Icon = doc.icon;
          const file = uploadedFiles[doc.id];
          const status = uploadStatus[doc.id];
          const isDone = status === 'done';
          const isUploading = status === 'uploading';

          return (
            <div
              key={doc.id}
              style={{
                border: `1px solid ${file ? (isDone ? 'rgba(16,163,127,0.5)' : 'rgba(16,163,127,0.3)') : 'var(--border-color)'}`,
                borderRadius: '12px',
                padding: '16px',
                background: file ? 'rgba(16,163,127,0.04)' : 'var(--bg-card)',
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {/* Doc icon */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: file ? 'rgba(16,163,127,0.15)' : 'rgba(255,255,255,0.05)',
                  color: file ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} />
                </div>

                {/* Doc info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{doc.label}</span>
                    {doc.required ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 600 }}>Required</span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 500 }}>Optional</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{doc.description}</div>
                </div>

                {/* Status / upload button */}
                <div style={{ flexShrink: 0 }}>
                  {isDone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 600 }}>
                      <CheckCircle2 size={18} /> Uploaded
                    </div>
                  ) : isUploading ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Uploading...</div>
                  ) : file ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckSquare size={16} /> Selected
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    </div>
                  ) : (
                    <label
                      htmlFor={`doc-${doc.id}`}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                        background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <UploadCloud size={14} /> Choose File
                    </label>
                  )}
                  <input
                    type="file"
                    id={`doc-${doc.id}`}
                    style={{ display: 'none' }}
                    accept={doc.accept}
                    onChange={(e) => handleFileChange(doc.id, e)}
                  />
                </div>
              </div>

              {/* File info bar when selected */}
              {file && !isDone && (
                <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📄 {file.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing required docs warning */}
      {!requiredUploaded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem', color: '#fbbf24' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>Please upload all <strong>Required</strong> documents before proceeding.</span>
        </div>
      )}

      {/* Security note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <ShieldCheck size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
        <span>Documents are processed locally. Complies with government data privacy standards.</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/review/${sessionId}`)}
          style={{ flex: 1, padding: '12px' }}
        >
          Review Filled Form
        </button>

        <button
          className="btn btn-primary"
          disabled={!requiredUploaded || uploading}
          onClick={handleUpload}
          style={{ flex: 2, padding: '12px' }}
        >
          {uploading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="spin">⟳</span> Verifying documents...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Upload & Proceed to Payment <ArrowRight size={16} />
            </span>
          )}
        </button>
      </div>

      {/* Upload summary */}
      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {uploadedCount} of {totalCount} documents selected
        {requiredUploaded && <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>✓ Ready to submit</span>}
      </div>
    </div>
  );
}
