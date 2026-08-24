from sqlalchemy import create_engine, Column, Integer, String, JSON, Text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./sevamitra_v2.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FormSession(Base):
    __tablename__ = "form_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    tracking_id = Column(String, unique=True, index=True, nullable=True)
    user_id = Column(String, index=True, nullable=True) # Mock auth user
    form_name = Column(String, nullable=True)
    questions = Column(JSON, nullable=True)  # List of questions
    responses = Column(JSON, nullable=True)  # Dictionary of collected responses
    status = Column(String, default="in_progress") # in_progress, pending_docs, pending_payment, completed, escalated

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    document_type = Column(String)
    file_path = Column(String)
    is_valid = Column(Integer, default=1) # 1=true, 0=false

class PaymentMock(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    amount = Column(Integer)
    status = Column(String, default="pending") # pending, paid

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
