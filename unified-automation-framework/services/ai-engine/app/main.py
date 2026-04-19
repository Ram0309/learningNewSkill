from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import logging
from contextlib import asynccontextmanager

from services.test_generator import TestGeneratorService
from services.flaky_detector import FlakyTestDetector
from services.maintenance_advisor import MaintenanceAdvisor
from services.failure_analyzer import FailureAnalyzer
from models.ml_models import ModelManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model manager
model_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global model_manager
    logger.info("Initializing AI Engine Service...")
    model_manager = ModelManager()
    await model_manager.load_models()
    logger.info("AI Engine Service initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Engine Service...")
    if model_manager:
        await model_manager.cleanup()

app = FastAPI(
    title="AI Engine Service",
    description="AI-powered test automation intelligence",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class TestGenerationRequest(BaseModel):
    project_id: str
    feature_description: str
    test_type: str
    priority: str
    existing_tests: Optional[List[Dict]] = []

class FlakyTestAnalysisRequest(BaseModel):
    test_results: List[Dict]
    time_window_days: int = 30
    confidence_threshold: float = 0.8

class MaintenanceRequest(BaseModel):
    test_case_id: str
    execution_history: List[Dict]
    code_changes: Optional[List[Dict]] = []

class FailureAnalysisRequest(BaseModel):
    test_execution_id: str
    failure_logs: List[str]
    screenshots: Optional[List[str]] = []
    environment_info: Dict

# Initialize services
test_generator = TestGeneratorService()
flaky_detector = FlakyTestDetector()
maintenance_advisor = MaintenanceAdvisor()
failure_analyzer = FailureAnalyzer()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-engine"}

@app.post("/api/v1/generate-tests")
async def generate_tests(request: TestGenerationRequest, background_tasks: BackgroundTasks):
    """Generate intelligent test cases based on feature description"""
    try:
        logger.info(f"Generating tests for project: {request.project_id}")
        
        generated_tests = await test_generator.generate_tests(
            project_id=request.project_id,
            feature_description=request.feature_description,
            test_type=request.test_type,
            priority=request.priority,
            existing_tests=request.existing_tests
        )
        
        # Background task to improve model based on feedback
        background_tasks.add_task(
            test_generator.update_model_feedback,
            request.project_id,
            generated_tests
        )
        
        return {
            "generated_tests": generated_tests,
            "count": len(generated_tests),
            "confidence_score": generated_tests[0].get("confidence", 0.0) if generated_tests else 0.0
        }
        
    except Exception as e:
        logger.error(f"Error generating tests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analyze-flaky-tests")
async def analyze_flaky_tests(request: FlakyTestAnalysisRequest):
    """Detect and analyze flaky tests using ML algorithms"""
    try:
        logger.info(f"Analyzing {len(request.test_results)} test results for flakiness")
        
        flaky_analysis = await flaky_detector.analyze_flakiness(
            test_results=request.test_results,
            time_window_days=request.time_window_days,
            confidence_threshold=request.confidence_threshold
        )
        
        return {
            "flaky_tests": flaky_analysis["flaky_tests"],
            "analysis_summary": flaky_analysis["summary"],
            "recommendations": flaky_analysis["recommendations"]
        }
        
    except Exception as e:
        logger.error(f"Error analyzing flaky tests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/maintenance-recommendations")
async def get_maintenance_recommendations(request: MaintenanceRequest):
    """Provide intelligent test maintenance recommendations"""
    try:
        logger.info(f"Generating maintenance recommendations for test: {request.test_case_id}")
        
        recommendations = await maintenance_advisor.analyze_maintenance_needs(
            test_case_id=request.test_case_id,
            execution_history=request.execution_history,
            code_changes=request.code_changes
        )
        
        return {
            "test_case_id": request.test_case_id,
            "maintenance_score": recommendations["score"],
            "recommendations": recommendations["actions"],
            "priority": recommendations["priority"],
            "estimated_effort": recommendations["effort_hours"]
        }
        
    except Exception as e:
        logger.error(f"Error generating maintenance recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analyze-failures")
async def analyze_test_failures(request: FailureAnalysisRequest):
    """Analyze test failures and provide intelligent insights"""
    try:
        logger.info(f"Analyzing failures for execution: {request.test_execution_id}")
        
        analysis = await failure_analyzer.analyze_failure(
            execution_id=request.test_execution_id,
            failure_logs=request.failure_logs,
            screenshots=request.screenshots,
            environment_info=request.environment_info
        )
        
        return {
            "execution_id": request.test_execution_id,
            "failure_category": analysis["category"],
            "root_cause": analysis["root_cause"],
            "confidence": analysis["confidence"],
            "suggested_fixes": analysis["fixes"],
            "similar_failures": analysis["similar_cases"]
        }
        
    except Exception as e:
        logger.error(f"Error analyzing failures: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/models/status")
async def get_model_status():
    """Get status of all ML models"""
    try:
        if not model_manager:
            raise HTTPException(status_code=503, detail="Model manager not initialized")
            
        status = await model_manager.get_status()
        return status
        
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/models/retrain")
async def retrain_models(background_tasks: BackgroundTasks):
    """Trigger model retraining"""
    try:
        background_tasks.add_task(model_manager.retrain_models)
        return {"message": "Model retraining initiated"}
        
    except Exception as e:
        logger.error(f"Error initiating model retraining: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )