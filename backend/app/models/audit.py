from datetime import datetime,timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)

from sqlalchemy.orm import relationship

from app.core.database import Base 

class ScanReport(Base):
    __tablename__= "scan_reports"
    
    id = Column(Integer,primary_key=True, index= True)
    target = Column(String, nullable=False)
    status = Column(String, nullable=False, default="success")
    pipeline_message = Column(String, nullable=False)
    
    total = Column(Integer,nullable=False,default=0)
    critical = Column(Integer,nullable=False,default=0)
    medium = Column(Integer,nullable=False,default=0)
    low = Column(Integer,nullable=False,default=0)
    ambiguous = Column(Integer,nullable=False,default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    findings = relationship(
        "Finding",
        back_populates="scan_report",
        cascade="all, delete-orphan",
    )
    
class Finding(Base):
        __tablename__="findings"
            
        id = Column(Integer, primary_key = True, index = True)
        scan_report_id = Column(Integer, ForeignKey("scan_reports.id"),nullable = False)
            
        category = Column(String,nullable=True)
        name = Column(String,nullable=False)
        file_path = Column(String,nullable=False)
        line = Column(Integer, nullable=False)
        value = Column(Text, nullable=False)
        severity = Column(String, nullable=False)
        confidence = Column(Float, nullable=True)
        entropy = Column(Float, nullable=True)
        context = Column(Text,nullable=True)
        description = Column(Text, nullable=True)
        review_required = Column(Boolean, default = False)
            
        scan_report = relationship("ScanReport",back_populates="findings")
        
        
        
    