package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type ExecutionOrchestrator struct {
	k8sClient   kubernetes.Interface
	httpServer  *http.Server
	jobManager  *JobManager
	metrics     *MetricsCollector
}

type TestExecutionRequest struct {
	TestSuiteID     string            `json:"testSuiteId" binding:"required"`
	ProjectID       string            `json:"projectId" binding:"required"`
	Environment     string            `json:"environment" binding:"required"`
	TestCases       []string          `json:"testCases"`
	Configuration   map[string]string `json:"configuration"`
	Priority        string            `json:"priority"`
	MaxParallelJobs int               `json:"maxParallelJobs"`
	Timeout         int               `json:"timeoutMinutes"`
}

type TestExecutionResponse struct {
	ExecutionID string `json:"executionId"`
	Status      string `json:"status"`
	Message     string `json:"message"`
}

func main() {
	// Initialize Kubernetes client
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("Failed to create Kubernetes config: %v", err)
	}

	k8sClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	// Initialize components
	metrics := NewMetricsCollector()
	jobManager := NewJobManager(k8sClient, metrics)
	
	orchestrator := &ExecutionOrchestrator{
		k8sClient:  k8sClient,
		jobManager: jobManager,
		metrics:    metrics,
	}

	// Setup HTTP server
	router := gin.Default()
	orchestrator.setupRoutes(router)

	orchestrator.httpServer = &http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	// Start server
	go func() {
		log.Println("Starting Execution Orchestrator on :8080")
		if err := orchestrator.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := orchestrator.httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func (eo *ExecutionOrchestrator) setupRoutes(router *gin.Engine) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	// Metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	v1 := router.Group("/api/v1")
	{
		v1.POST("/executions", eo.createExecution)
		v1.GET("/executions/:id", eo.getExecution)
		v1.DELETE("/executions/:id", eo.cancelExecution)
		v1.GET("/executions/:id/status", eo.getExecutionStatus)
		v1.GET("/executions/:id/logs", eo.getExecutionLogs)
	}
}

func (eo *ExecutionOrchestrator) createExecution(c *gin.Context) {
	var req TestExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	executionID, err := eo.jobManager.CreateTestExecution(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := TestExecutionResponse{
		ExecutionID: executionID,
		Status:      "QUEUED",
		Message:     "Test execution created successfully",
	}

	c.JSON(http.StatusCreated, response)
}

func (eo *ExecutionOrchestrator) getExecution(c *gin.Context) {
	executionID := c.Param("id")
	
	execution, err := eo.jobManager.GetExecution(c.Request.Context(), executionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Execution not found"})
		return
	}

	c.JSON(http.StatusOK, execution)
}

func (eo *ExecutionOrchestrator) cancelExecution(c *gin.Context) {
	executionID := c.Param("id")
	
	err := eo.jobManager.CancelExecution(c.Request.Context(), executionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Execution cancelled successfully"})
}

func (eo *ExecutionOrchestrator) getExecutionStatus(c *gin.Context) {
	executionID := c.Param("id")
	
	status, err := eo.jobManager.GetExecutionStatus(c.Request.Context(), executionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Execution not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

func (eo *ExecutionOrchestrator) getExecutionLogs(c *gin.Context) {
	executionID := c.Param("id")
	
	logs, err := eo.jobManager.GetExecutionLogs(c.Request.Context(), executionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}