// Local Storage persistence helper for offline/production resilience

export function saveLocalSession(sessionId, sessionData) {
  try {
    const existing = JSON.parse(localStorage.getItem('sevamitra_sessions') || '{}');
    existing[sessionId] = {
      ...existing[sessionId],
      ...sessionData,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem('sevamitra_sessions', JSON.stringify(existing));
    localStorage.setItem(`sevamitra_session_${sessionId}`, JSON.stringify(existing[sessionId]));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

export function getLocalSession(sessionId) {
  try {
    const data = localStorage.getItem(`sevamitra_session_${sessionId}`);
    if (data) return JSON.parse(data);
    const all = JSON.parse(localStorage.getItem('sevamitra_sessions') || '{}');
    return all[sessionId] || null;
  } catch (e) {
    return null;
  }
}

export function getAllLocalApplications() {
  try {
    const all = JSON.parse(localStorage.getItem('sevamitra_sessions') || '{}');
    return Object.values(all).filter(s => s && s.form_name);
  } catch (e) {
    return [];
  }
}
