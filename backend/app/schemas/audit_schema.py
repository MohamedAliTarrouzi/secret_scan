from datetime import datetime
from pydantic import BaseModel, ConfigDict

class FindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id:int
    category: str | None = None
    name: str
    file_path: str
    line: int
    value: str
    severity: str
    confidence: float | None = None
    entropy: float | None = None
    context: str | None = None
    description: str | None = None
    review_required: bool = False
    
class ScanSummary(BaseModel):
    total: int
    critical: int
    medium: int
    low: int
    ambiguous: int
    
class ScanReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    status: str
    target: str
    pipeline_message: str
    created_at: datetime
    findings: list[FindingRead] = []
    
    @property
    def summary(self) -> ScanSummary:
        return ScanSummary(
            total=self.total,
            critical=self.critical,
            medium=self.medium,
            low=self.low,
            ambiguous=self.ambiguous,
        )
    
    # champs bruts nécessaires au calcul de summary, exclus de la sortie JSON directe
    total: int
    critical: int
    medium: int
    low: int
    ambiguous: int
    