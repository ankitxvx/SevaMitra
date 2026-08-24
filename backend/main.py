from fastapi import FastAPI, UploadFile, File, Depends, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import shutil
import os
import uuid
import json

from backend.db import get_db, FormSession, PaymentMock, Document
from backend.ai_service import speech_to_english, generate_questions, ask_llama

from pydantic import BaseModel

app = FastAPI(title="SevaMitraAI Backend")

class FormSelectionRequest(BaseModel):
    session_id: str
    form_name: str

class ProcessTextRequest(BaseModel):
    session_id: str
    text: str
    question_index: Optional[int] = None

class LoginRequest(BaseModel):
    phone: str

class UpdateResponseRequest(BaseModel):
    session_id: str
    question: str
    new_value: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

@app.post("/api/login")
def login(req: LoginRequest):
    # Mock login, in a real app this would verify OTP
    return {"user_id": req.phone, "token": f"mock_token_{req.phone}"}

@app.post("/api/session")
def create_session(db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    new_session = FormSession(session_id=session_id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"session_id": session_id}

@app.get("/api/resume-session/{session_id}")
def resume_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(FormSession).filter(FormSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "form_name": session.form_name,
        "questions": session.questions,
        "responses": session.responses or {},
        "status": session.status,
        "tracking_id": session.tracking_id
    }

@app.get("/api/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(FormSession).filter(FormSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "form_name": session.form_name,
        "questions": session.questions,
        "responses": session.responses or {},
        "status": session.status,
        "tracking_id": session.tracking_id
    }

@app.post("/api/update-response")
def update_response(req: UpdateResponseRequest, db: Session = Depends(get_db)):
    session = db.query(FormSession).filter(FormSession.session_id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    responses = dict(session.responses or {})
    responses[req.question] = req.new_value
    session.responses = responses
    db.commit()
    return {"message": "Field updated successfully", "responses": session.responses}

@app.get("/api/applications")
def get_all_applications(db: Session = Depends(get_db)):
    sessions = db.query(FormSession).order_by(FormSession.id.desc()).all()
    return [
        {
            "id": s.id,
            "session_id": s.session_id,
            "tracking_id": s.tracking_id,
            "form_name": s.form_name,
            "status": s.status,
            "responses": s.responses or {},
            "questions": s.questions or [],
            "answers_count": len(s.responses) if s.responses else 0,
            "total_questions": len(s.questions) if s.questions else 0
        }
        for s in sessions if s.form_name
    ]

@app.post("/api/process-audio")
async def process_audio(
    session_id: str = Form(...),
    step: str = Form(...), # 'form_selection', 'answer_question'
    question_index: Optional[int] = Form(None),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    session = db.query(FormSession).filter(FormSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    temp_audio_path = f"uploads/{uuid.uuid4()}.wav"
    with open(temp_audio_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    try:
        translated_text = speech_to_english(temp_audio_path)
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

    if not translated_text:
        return {"error": "Could not understand audio. Please try again."}

    if step == "form_selection":
        form_name = translated_text
        questions = generate_questions(form_name)
        
        session.form_name = form_name
        session.questions = questions
        session.responses = {}
        db.commit()
        return {"form_name": form_name, "questions": questions, "translated_text": translated_text}
    
    elif step == "answer_question":
        if question_index is None or not session.questions or question_index >= len(session.questions):
            return {"error": "Invalid question index"}
        
        question = session.questions[question_index]
        responses = session.responses or {}
        responses[question] = translated_text
        session.responses = responses
        
        # Check if all questions are answered
        if len(responses) >= len(session.questions):
            session.status = "pending_docs"
            # Create mock payment in advance for the next step
            mock_payment = PaymentMock(session_id=session_id, amount=150)
            db.add(mock_payment)
            
        db.commit()
        return {"question": question, "answer": translated_text, "status": session.status}

@app.post("/api/select-form")
async def select_form(
    request: FormSelectionRequest,
    db: Session = Depends(get_db)
):
    session = db.query(FormSession).filter(FormSession.session_id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    questions = generate_questions(request.form_name)
    session.form_name = request.form_name
    session.questions = questions
    session.responses = {}
    db.commit()
    return {"form_name": request.form_name, "questions": questions}

@app.post("/api/process-text")
async def process_text(
    request: ProcessTextRequest,
    db: Session = Depends(get_db)
):
    session = db.query(FormSession).filter(FormSession.session_id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.form_name:
        form_name = request.text
        questions = generate_questions(form_name)
        session.form_name = form_name
        session.questions = questions
        session.responses = {}
        db.commit()
        return {"form_name": form_name, "questions": questions, "status": session.status}

    if request.question_index is None or not session.questions or request.question_index >= len(session.questions):
        return {"error": "Invalid question index"}

    question = session.questions[request.question_index]
    responses = session.responses or {}
    responses[question] = request.text
    session.responses = responses

    if len(responses) >= len(session.questions):
        session.status = "pending_docs"
        mock_payment = PaymentMock(session_id=session.session_id, amount=150)
        db.add(mock_payment)

    db.commit()
    return {"question": question, "answer": request.text, "status": session.status}

@app.post("/api/upload-document")
async def upload_document(
    session_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    session = db.query(FormSession).filter(FormSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    file_path = f"uploads/{session_id}_{document_type}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Mock OCR Validation
    doc = Document(session_id=session_id, document_type=document_type, file_path=file_path, is_valid=1)
    db.add(doc)
    
    # Check if we have enough docs (assume 1 for MVP)
    docs_count = db.query(Document).filter(Document.session_id == session_id).count()
    if docs_count >= 1: # We just added one, so it will be >= 1
        session.status = "pending_payment"
        
    db.commit()
    
    return {"message": "Document uploaded successfully", "path": file_path, "status": session.status}

@app.post("/api/pay")
async def mock_payment(
    session_id: str = Form(...),
    db: Session = Depends(get_db)
):
    payment = db.query(PaymentMock).filter(PaymentMock.session_id == session_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="No pending payment found")
        
    session = db.query(FormSession).filter(FormSession.session_id == session_id).first()
    
    payment.status = "paid"
    session.status = "completed"
    session.tracking_id = f"TRK-{str(uuid.uuid4())[:8].upper()}"
    
    db.commit()
    return {"message": "Payment successful", "tracking_id": session.tracking_id}

@app.get("/api/track-status/{tracking_id}")
def track_status(tracking_id: str, db: Session = Depends(get_db)):
    session = db.query(FormSession).filter(FormSession.tracking_id == tracking_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Application not found")
        
    return {
        "form_name": session.form_name,
        "status": session.status,
        "submitted_at": "2026-08-24" # Mock date
    }

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_sessions = db.query(FormSession).count()
    completed_sessions = db.query(FormSession).filter(FormSession.status == "completed").count()
    pending_sessions = total_sessions - completed_sessions
    
    # Get payments
    total_revenue = db.query(PaymentMock).filter(PaymentMock.status == "paid").count() * 150
    
    # recent forms
    recent = db.query(FormSession).order_by(FormSession.id.desc()).limit(10).all()
    recent_data = [{"id": s.id, "session_id": s.session_id, "form_name": s.form_name, "status": s.status} for s in recent]
    
    return {
        "total_forms": total_sessions,
        "completed": completed_sessions,
        "pending": pending_sessions,
        "revenue": total_revenue,
        "recent_forms": recent_data
    }
