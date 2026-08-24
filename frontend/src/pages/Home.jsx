import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Mic, MicOff, Send, Bot, User, FileText, CheckCircle, 
  Sparkles, Volume2, VolumeX, Radio, MessageSquare, Globe,
  CheckCircle2, ArrowRight, Eye, RefreshCw, FolderCheck, ShieldCheck 
} from 'lucide-react';

import { API_URL } from '../config';

const PRESET_SERVICES = [
  { id: 'income', title: 'Income Certificate', desc: 'Annual family income certificate for subsidies and admissions' },
  { id: 'caste', title: 'Caste Certificate', desc: 'Community verification certificate for reservations' },
  { id: 'domicile', title: 'Domicile Certificate', desc: 'Proof of permanent residency in the state' },
  { id: 'solvency', title: 'Solvency Certificate', desc: 'Financial standing validation for tenders & legal needs' },
];

const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', label: 'हिंदी (Hindi)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
];

export function Home() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [step, setStep] = useState('start'); // start, processing, form, completed_form
  const [mode, setMode] = useState('voice'); // 'voice' or 'chat'
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  
  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: 'Namaste! I am SevaMitraAI, your voice assistant for revenue department certificates. Which service would you like to apply for?'
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  
  const [formData, setFormData] = useState({
    form_name: '',
    questions: [],
    currentQuestionIndex: 0
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Initialize session on load
  useEffect(() => {
    axios.post(`${API_URL}/session`)
      .then(res => setSessionId(res.data.session_id))
      .catch(err => console.error("Session error:", err));
  }, []);

  // Text-To-Speech (TTS) function
  const speakText = (text) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#🎤✅🎉]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedLang;
    utterance.rate = 0.95;
    
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(selectedLang.slice(0, 2)));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const addMessage = (text, sender = 'bot', shouldSpeak = true) => {
    setChatHistory(prev => [...prev, { text, sender, id: `${Date.now()}-${Math.random()}` }]);
    if (sender === 'bot' && shouldSpeak) {
      speakText(text);
    }
  };

  // Speak welcome message on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ttsEnabled) {
        speakText('Namaste! I am SevaMitraAI. Which government service would you like to apply for? Please speak or choose below.');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, step, isRecording, completedSummary]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Fetch final form summary upon completion
  const handleFormCompletion = async () => {
    setStep('completed_form');
    try {
      const res = await axios.get(`${API_URL}/session/${sessionId}`);
      setCompletedSummary(res.data.responses || {});
      addMessage(`🎉 Great! All details for ${formData.form_name} have been collected. Please confirm your filled form summary below.`, "bot");
    } catch (err) {
      console.error(err);
      addMessage(`All details collected! Please review your form.`, "bot");
    }
  };

  // Toggle Voice Recording
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          await handleAudioSubmit(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Microphone access denied or unavailable. Please grant microphone permissions.');
      }
    }
  };

  // Process Audio
  const handleAudioSubmit = async (audioBlob) => {
    if (!sessionId) return;
    
    setStep('processing');
    const payload = new FormData();
    payload.append('session_id', sessionId);
    payload.append('audio', audioBlob, 'voice_input.wav');
    
    try {
      if (!formData.form_name) {
        payload.append('step', 'form_selection');
        const res = await axios.post(`${API_URL}/process-audio`, payload);
        
        if (res.data.error) {
          addMessage(res.data.error, "bot");
          setStep('start');
          return;
        }

        addMessage(`🎤 "${res.data.translated_text}"`, "user");
        
        if (res.data.questions && res.data.questions.length > 0) {
          setFormData({
            form_name: res.data.form_name,
            questions: res.data.questions,
            currentQuestionIndex: 0
          });
          const firstQuestion = res.data.questions[0];
          addMessage(`I will help you apply for ${res.data.form_name}. Here is question 1: ${firstQuestion}`, "bot");
          setStep('form');
        } else {
          addMessage("Could not determine the certificate type. Please speak again or select an option.", "bot");
          setStep('start');
        }
      } else {
        payload.append('step', 'answer_question');
        payload.append('question_index', formData.currentQuestionIndex);
        
        const res = await axios.post(`${API_URL}/process-audio`, payload);
        
        if (res.data.error) {
          addMessage(res.data.error, "bot");
          setStep('form');
          return;
        }

        addMessage(`🎤 "${res.data.answer}"`, "user");
        
        if (res.data.status === 'pending_docs') {
          await handleFormCompletion();
        } else {
          const nextIndex = formData.currentQuestionIndex + 1;
          setFormData(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
          const nextQuestion = formData.questions[nextIndex];
          addMessage(`Question ${nextIndex + 1}: ${nextQuestion}`, "bot");
          setStep('form');
        }
      }
    } catch (error) {
      console.error("Audio error:", error);
      addMessage("An error occurred while processing speech. Please try again.", "bot");
      setStep(formData.form_name ? 'form' : 'start');
    }
  };

  // Text Input Submit
  const handleSendText = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !sessionId || step === 'processing') return;

    const userText = inputText.trim();
    setInputText('');
    addMessage(userText, "user");
    setStep('processing');
    
    try {
      if (!formData.form_name) {
        const res = await axios.post(`${API_URL}/select-form`, {
          session_id: sessionId,
          form_name: userText
        });
        
        if (res.data.questions && res.data.questions.length > 0) {
          setFormData({
            form_name: res.data.form_name,
            questions: res.data.questions,
            currentQuestionIndex: 0
          });
          const firstQuestion = res.data.questions[0];
          addMessage(`Understood! Let's fill the application for ${res.data.form_name}. Question 1: ${firstQuestion}`, "bot");
          setStep('form');
        } else {
          addMessage("Could not generate fields for that service. Please try again.", "bot");
          setStep('start');
        }
      } else {
        const res = await axios.post(`${API_URL}/process-text`, {
          session_id: sessionId,
          text: userText,
          question_index: formData.currentQuestionIndex
        });

        if (res.data.status === 'pending_docs') {
          await handleFormCompletion();
        } else {
          const nextIndex = formData.currentQuestionIndex + 1;
          setFormData(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
          const nextQuestion = formData.questions[nextIndex];
          addMessage(`Question ${nextIndex + 1}: ${nextQuestion}`, "bot");
          setStep('form');
        }
      }
    } catch (error) {
      console.error("Text process error:", error);
      addMessage("Failed to process your response. Please try again.", "bot");
      setStep(formData.form_name ? 'form' : 'start');
    }
  };

  // Select Preset Form
  const selectPreset = async (formName) => {
    if (!sessionId) return;
    setStep('processing');
    addMessage(`I want to apply for ${formName}`, "user");
    
    try {
      const res = await axios.post(`${API_URL}/select-form`, {
        session_id: sessionId,
        form_name: formName
      });
      
      if (res.data.questions && res.data.questions.length > 0) {
        setFormData({
          form_name: res.data.form_name,
          questions: res.data.questions,
          currentQuestionIndex: 0
        });
        const firstQuestion = res.data.questions[0];
        addMessage(`Great! I will guide you through the ${res.data.form_name} application. Question 1: ${firstQuestion}`, "bot");
        setStep('form');
      }
    } catch (error) {
      console.error(error);
      addMessage("Error initializing form. Please try again.", "bot");
      setStep('start');
    }
  };

  const latestBotMessage = [...chatHistory].reverse().find(m => m.sender === 'bot')?.text || '';

  return (
    <div className="chat-page">
      
      {/* Speech-First Controls Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {formData.form_name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formData.form_name}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Voice Citizen Assistant</span>
            </div>
          )}

          {formData.form_name && (
            <div className="progress-pill">
              <CheckCircle size={14} />
              {step === 'completed_form' ? 'All Questions Completed' : `Step ${formData.currentQuestionIndex + 1} of ${formData.questions.length}`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} color="var(--text-secondary)" />
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              className="lang-select-dropdown"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* TTS Audio Voice Toggle */}
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => {
              if (ttsEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              setTtsEnabled(!ttsEnabled);
            }}
            title={ttsEnabled ? "Mute Voice Narration" : "Enable Voice Narration"}
          >
            {ttsEnabled ? <Volume2 size={16} color="var(--accent)" /> : <VolumeX size={16} color="var(--text-muted)" />}
            <span style={{ fontSize: '0.8rem' }}>{ttsEnabled ? "Voice ON" : "Muted"}</span>
          </button>

          {/* Mode Switcher */}
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
          >
            {mode === 'voice' ? <MessageSquare size={16} /> : <Radio size={16} color="var(--accent)" />}
            <span>{mode === 'voice' ? 'Show Transcript' : 'Voice Mode'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          MODE 1: IMMERSIVE SPEECH-FIRST VOICE ORB INTERFACE
          ========================================================= */}
      {mode === 'voice' ? (
        <div className="voice-mode-overlay" style={{ overflowY: 'auto', justifyContent: step === 'completed_form' ? 'flex-start' : 'center' }}>
          
          {step === 'completed_form' ? (
            /* =========================================================
               LIVE CONFIRMATION & FILLED FORM CARD (VOICE VIEW)
               ========================================================= */
            <div className="card" style={{ maxWidth: '640px', width: '100%', textAlign: 'left', marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 163, 127, 0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Application Completed & Verified</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Service: {formData.form_name}</span>
                  </div>
                </div>

                <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'rgba(16, 163, 127, 0.15)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Ready For Submission
                </span>
              </div>

              {/* Filled Details Summary Table */}
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Extracted Form Details:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {completedSummary && Object.entries(completedSummary).map(([question, answer], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)', flex: 1 }}>{question}:</span>
                      <strong style={{ color: 'var(--text-primary)', flex: 1, textAlign: 'right' }}>{answer}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '10px' }}
                  onClick={() => navigate(`/review/${sessionId}`)}
                >
                  <Eye size={16} /> Edit / Review Form
                </button>

                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1.5, padding: '10px' }}
                  onClick={() => navigate(`/upload/${sessionId}`)}
                >
                  Proceed to Upload Documents <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', gap: '16px' }}>
                <button 
                  onClick={() => navigate('/applications')} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FolderCheck size={14} /> View in My Filled Forms
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Start New Form
                </button>
              </div>

            </div>
          ) : (
            <>
              <div className="voice-status-text">
                {isRecording ? "Listening to your voice..." : (
                  isSpeaking ? "SevaMitra is speaking..." : (
                    step === 'processing' ? "Thinking..." : "Tap the sphere to speak"
                  )
                )}
              </div>

              <div className="voice-prompt-subtext">
                {latestBotMessage}
              </div>

              {/* Animated Interactive Voice Orb */}
              <div className="voice-orb-container" onClick={toggleRecording}>
                <div className="voice-ring"></div>
                <div className="voice-ring"></div>
                <div className="voice-ring"></div>
                <div className={`voice-orb ${isRecording ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                  {isRecording ? <MicOff size={44} /> : <Mic size={44} />}
                </div>
              </div>

              {/* Live Waveform when speaking or recording */}
              {(isRecording || isSpeaking) && (
                <div className="audio-wave-bars">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              )}

              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px' }}>
                {isRecording 
                  ? `Recording in progress (${recordingSeconds}s)... Tap to submit answer` 
                  : "Speak naturally in Hindi, English or regional languages."
                }
              </div>

              {/* Quick preset buttons in Voice Mode */}
              {!formData.form_name && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '32px', maxWidth: '640px' }}>
                  {PRESET_SERVICES.map(s => (
                    <button 
                      key={s.id} 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                      onClick={() => selectPreset(s.title)}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      ) : (

        /* =========================================================
           MODE 2: CHAT TRANSCRIPT VIEW
           ========================================================= */
        <div className="chat-scroll-area" ref={chatScrollRef}>
          
          {/* Welcome Cards for New Session */}
          {!formData.form_name && chatHistory.length <= 1 && (
            <div className="welcome-container">
              <div className="welcome-title">Voice-First Government Services</div>
              <div className="welcome-subtitle">
                Apply for certificates by speaking or typing. Every question is read aloud in your language.
              </div>
              
              <div className="preset-cards">
                {PRESET_SERVICES.map(service => (
                  <div 
                    key={service.id} 
                    className="preset-card"
                    onClick={() => selectPreset(service.title)}
                  >
                    <div className="preset-card-title">{service.title}</div>
                    <div className="preset-card-desc">{service.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Thread */}
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
              <div className="chat-content">
                <div className={`avatar ${msg.sender}`}>
                  {msg.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="message-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="message-author">{msg.sender === 'bot' ? 'SevaMitraAI' : 'You'}</div>
                    {msg.sender === 'bot' && (
                      <button 
                        className="speaker-btn"
                        onClick={() => speakText(msg.text)}
                        title="Listen to this question aloud"
                      >
                        <Volume2 size={14} /> Read aloud
                      </button>
                    )}
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Confirmation Card inside Chat View */}
          {step === 'completed_form' && completedSummary && (
            <div className="chat-bubble-wrapper bot">
              <div className="chat-content">
                <div className="avatar bot"><CheckCircle2 size={18} /></div>
                <div className="message-body">
                  <div className="card" style={{ padding: '20px', background: 'var(--bg-input)', border: '1px solid rgba(16, 163, 127, 0.4)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>
                      Form Confirmation: {formData.form_name}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
                      {Object.entries(completedSummary).map(([question, answer], idx) => (
                        <div key={idx} style={{ fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{question}: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{answer}</strong>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button className="btn btn-secondary" onClick={() => navigate(`/review/${sessionId}`)}>
                        <Eye size={15} /> Review & Edit
                      </button>
                      <button className="btn btn-primary" onClick={() => navigate(`/upload/${sessionId}`)}>
                        Upload Documents <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {step === 'processing' && (
            <div className="chat-bubble-wrapper bot">
              <div className="chat-content">
                <div className="avatar bot"><Bot size={18} /></div>
                <div className="message-body">
                  <div className="message-author">SevaMitraAI</div>
                  <div className="message-text" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Sparkles size={16} className="spin" /> Processing speech & translating...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Voice Control Area (Pure Speech Interface) */}
      {step !== 'completed_form' && mode === 'chat' && (
        <div className="input-area">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '480px' }}>
            <button 
              type="button"
              className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                background: isRecording ? 'var(--danger)' : 'var(--accent)',
                boxShadow: isRecording ? '0 0 25px rgba(239, 68, 68, 0.5)' : '0 4px 20px var(--accent-glow)'
              }}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <>
                  <MicOff size={22} />
                  <span>Stop & Submit Speech ({recordingSeconds}s)</span>
                </>
              ) : (
                <>
                  <Mic size={22} />
                  <span>Tap to Speak Your Answer</span>
                </>
              )}
            </button>

            <div className="input-helper-text">
              Speech-Only Mode: Click to talk in Hindi, English, or any regional language.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
