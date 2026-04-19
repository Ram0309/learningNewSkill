/**
 * Test Execution Dashboard JavaScript
 * Handles data loading, filtering, and visualization
 */

class TestExecutionDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentFilters = {};
        this.charts = {};
        this.autoRefreshInterval = null;
        this.currentPage = 1;
        this.pageSize = 10;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading(true);
            await this.loadInitialData();
            this.setupEventListeners();
            this.initializeDateFilters();
            this.showLoading(false);
        } catch (error) {
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    async loadInitialData() {
        try {
            // Load dashboard metrics
            const metrics = await this.fetchDashboardMetrics();
            this.updateMetricsCards(metrics);
            this.createCharts(metrics);
            
            // Load recent executions
            await this.loadExecutions();
            
            // Load filter options
            await this.loadFilterOptions();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    async fetchDashboardMetrics(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`${this.apiBaseUrl}/dashboard/metrics?${queryParams}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            // Return mock data for development
            return this.getMockMetrics();
        }
    }

    async fetchExecutions(filters = {}, page = 1, pageSize = 10) {
        try {
            const queryParams = new URLSearchParams({
                ...filters,
                page: page.toString(),
                pageSize: pageSize.toString()
            });
            
            const response = await fetch(`${this.apiBaseUrl}/executions?${queryParams}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching executions:', error);
            // Return mock data for development
            return this.getMockExecutions();
        }
    }

    updateMetricsCards(metrics) {
        document.getElementById('totalExecutions').textContent = metrics.totalExecutions.toLocaleString();
        document.getElementById('totalTests').textContent = metrics.totalTests.toLocaleString();
        document.getElementById('overallPassRate').textContent = `${metrics.overallPassRate.toFixed(1)}%`;
        document.getElementById('avgExecutionTime').textContent = this.formatDuration(metrics.avgExecutionTime);

        // Update trends (mock implementation)
        this.updateTrendIndicator('executionsTrend', 5.2, true);
        this.updateTrendIndicator('testsTrend', -2.1, false);
        this.updateTrendIndicator('passRateTrend', 1.8, true);
        this.updateTrendIndicator('durationTrend', -3.5, true);
    }

    updateTrendIndicator(elementId, percentage, isPositive) {
        const element = document.getElementById(elementId);
        const absPercentage = Math.abs(percentage);
        
        if (percentage > 0) {
            element.className = isPositive ? 'trend-up' : 'trend-down';
            element.innerHTML = `<i class="fas fa-arrow-up"></i> +${absPercentage}%`;
        } else if (percentage < 0) {
            element.className = isPositive ? 'trend-down' : 'trend-up';
            element.innerHTML = `<i class="fas fa-arrow-down"></i> -${absPercentage}%`;
        } else {
            element.className = 'trend-neutral';
            element.innerHTML = '<i class="fas fa-minus"></i> No change';
        }
    }

    createCharts(metrics) {
        this.createTrendsChart(metrics.executionTrends);
        this.createPassFailChart(metrics);
        this.createEnvironmentChart(metrics.environmentStats);
        this.createErrorChart(metrics.errorDistribution);
    }

    createTrendsChart(trendsData) {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        const labels = trendsData.map(item => this.formatDate(item.date));
        const executionsData = trendsData.map(item => item.executions);
        const passRateData = trendsData.map(item => item.passRate);

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Executions',
                        data: executionsData,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Pass Rate (%)',
                        data: passRateData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Executions'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Pass Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                if (context.datasetIndex === 1) {
                                    return context.parsed.y.toFixed(1) + '%';
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    }

    createPassFailChart(metrics) {
        const ctx = document.getElementById('passFailChart').getContext('2d');
        
        if (this.charts.passFail) {
            this.charts.passFail.destroy();
        }

        const totalTests = metrics.totalTests;
        const passedTests = Math.round(totalTests * metrics.overallPassRate / 100);
        const failedTests = totalTests - passedTests;

        this.charts.passFail = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [passedTests, failedTests],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createEnvironmentChart(environmentStats) {
        const ctx = document.getElementById('environmentChart').getContext('2d');
        
        if (this.charts.environment) {
            this.charts.environment.destroy();
        }

        const labels = Object.keys(environmentStats);
        const executionsData = labels.map(env => environmentStats[env].executions);
        const passRateData = labels.map(env => environmentStats[env].passRate);

        this.charts.environment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(label => label.toUpperCase()),
                datasets: [
                    {
                        label: 'Executions',
                        data: executionsData,
                        backgroundColor: 'rgba(0, 123, 255, 0.8)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Pass Rate (%)',
                        data: passRateData,
                        backgroundColor: 'rgba(40, 167, 69, 0.8)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Executions'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Pass Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    createErrorChart(errorDistribution) {
        const ctx = document.getElementById('errorChart').getContext('2d');
        
        if (this.charts.error) {
            this.charts.error.destroy();
        }

        const labels = Object.keys(errorDistribution);
        const data = Object.values(errorDistribution);
        const colors = [
            '#dc3545', '#fd7e14', '#ffc107', '#20c997',
            '#6f42c1', '#e83e8c', '#6c757d', '#17a2b8'
        ];

        this.charts.error = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    async loadExecutions() {
        try {
            const data = await this.fetchExecutions(this.currentFilters, this.currentPage, this.pageSize);
            this.updateExecutionsTable(data.executions);
            this.updateFailingTestsTable(data.topFailingTests || []);
            this.updatePagination(data.totalPages, data.currentPage);
        } catch (error) {
            console.error('Error loading executions:', error);
        }
    }

    updateExecutionsTable(executions) {
        const tbody = document.getElementById('executionsBody');
        
        if (!executions || executions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No executions found</td></tr>';
            return;
        }

        tbody.innerHTML = executions.map(execution => `
            <tr>
                <td>
                    <code class="small">${execution.metadata.executionId.substring(0, 8)}...</code>
                </td>
                <td>${execution.metadata.project}</td>
                <td>
                    <span class="badge bg-${this.getEnvironmentBadgeColor(execution.metadata.environment)}">
                        ${execution.metadata.environment.toUpperCase()}
                    </span>
                </td>
                <td>${this.formatDateTime(execution.metadata.timestamp.start)}</td>
                <td>${this.formatDuration(execution.metadata.timestamp.duration)}</td>
                <td>
                    <span class="text-success">${execution.summary.passed}</span> /
                    <span class="text-danger">${execution.summary.failed}</span> /
                    <span class="text-warning">${execution.summary.skipped}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div class="progress-bar bg-success" style="width: ${execution.summary.passRate}%"></div>
                        </div>
                        <small>${execution.summary.passRate.toFixed(1)}%</small>
                    </div>
                </td>
                <td>
                    <span class="badge status-badge bg-${this.getStatusBadgeColor(execution.summary.passRate)}">
                        ${this.getStatusText(execution.summary.passRate)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.viewExecutionDetails('${execution.metadata.executionId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateFailingTestsTable(failingTests) {
        const tbody = document.getElementById('failingTestsBody');
        
        if (!failingTests || failingTests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No failing tests found</td></tr>';
            return;
        }

        tbody.innerHTML = failingTests.map(test => `
            <tr>
                <td>
                    <div class="text-truncate" style="max-width: 300px;" title="${test.testName}">
                        ${test.testName}
                    </div>
                </td>
                <td>
                    <span class="badge bg-danger">${test.failureCount}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div class="progress-bar bg-danger" style="width: ${test.failureRate}%"></div>
                        </div>
                        <small>${test.failureRate.toFixed(1)}%</small>
                    </div>
                </td>
                <td>
                    <small class="text-muted">${this.formatDate(new Date())}</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="dashboard.analyzeTest('${test.testName}')">
                        <i class="fas fa-search"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadFilterOptions() {
        try {
            // Load projects
            const projects = await this.fetchProjects();
            this.populateSelect('projectFilter', projects);

            // Load squads
            const squads = await this.fetchSquads();
            this.populateSelect('squadFilter', squads);
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        // Keep the "All" option and add new options
        const allOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        select.appendChild(allOption);
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value || option;
            optionElement.textContent = option.label || option;
            select.appendChild(optionElement);
        });
        
        // Restore previous selection
        select.value = currentValue;
    }

    setupEventListeners() {
        // Filter change listeners
        ['dateFrom', 'dateTo', 'projectFilter', 'squadFilter', 'environmentFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.currentFilters[id.replace('Filter', '')] = document.getElementById(id).value;
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshDashboard();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }
        });
    }

    initializeDateFilters() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        document.getElementById('dateFrom').value = this.formatDateInput(thirtyDaysAgo);
        document.getElementById('dateTo').value = this.formatDateInput(today);
        
        this.currentFilters.dateFrom = this.formatDateInput(thirtyDaysAgo);
        this.currentFilters.dateTo = this.formatDateInput(today);
    }

    async applyFilters() {
        this.showLoading(true);
        try {
            const metrics = await this.fetchDashboardMetrics(this.currentFilters);
            this.updateMetricsCards(metrics);
            this.createCharts(metrics);
            await this.loadExecutions();
        } catch (error) {
            this.showError('Failed to apply filters: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async refreshDashboard() {
        await this.applyFilters();
    }

    exportData() {
        const modal = new bootstrap.Modal(document.getElementById('exportModal'));
        modal.show();
    }

    async performExport() {
        const format = document.getElementById('exportFormat').value;
        const dataType = document.getElementById('exportData').value;
        const includeFilters = document.getElementById('includeFilters').checked;
        
        try {
            const filters = includeFilters ? this.currentFilters : {};
            const response = await fetch(`${this.apiBaseUrl}/export/${dataType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format,
                    filters
                })
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `test-execution-${dataType}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
            modal.hide();
        } catch (error) {
            alert('Export failed: ' + error.message);
        }
    }

    toggleAutoRefresh() {
        const button = document.getElementById('autoRefreshText');
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            button.textContent = 'Enable Auto-refresh';
        } else {
            this.autoRefreshInterval = setInterval(() => {
                this.refreshDashboard();
            }, 30000); // Refresh every 30 seconds
            button.textContent = 'Disable Auto-refresh';
        }
    }

    viewExecutionDetails(executionId) {
        // Open execution details in a new window or modal
        window.open(`/execution-details.html?id=${executionId}`, '_blank');
    }

    analyzeTest(testName) {
        // Open test analysis view
        window.open(`/test-analysis.html?test=${encodeURIComponent(testName)}`, '_blank');
    }

    showLoading(show) {
        const spinner = document.querySelector('.loading-spinner');
        const content = document.getElementById('metricsCards').parentElement;
        
        if (show) {
            spinner.style.display = 'block';
            content.style.opacity = '0.5';
        } else {
            spinner.style.display = 'none';
            content.style.opacity = '1';
        }
    }

    showError(message) {
        const errorDiv = document.querySelector('.error-message');
        const errorText = document.getElementById('error-text');
        
        errorText.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    // Utility methods
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString();
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    }

    formatDateInput(date) {
        return date.toISOString().split('T')[0];
    }

    getEnvironmentBadgeColor(environment) {
        const colors = {
            'dev': 'secondary',
            'qa': 'info',
            'stage': 'warning',
            'prod': 'danger'
        };
        return colors[environment] || 'secondary';
    }

    getStatusBadgeColor(passRate) {
        if (passRate >= 90) return 'success';
        if (passRate >= 70) return 'warning';
        return 'danger';
    }

    getStatusText(passRate) {
        if (passRate >= 90) return 'Excellent';
        if (passRate >= 70) return 'Good';
        return 'Needs Attention';
    }

    // Mock data methods for development
    getMockMetrics() {
        return {
            totalExecutions: 1247,
            totalTests: 15623,
            overallPassRate: 87.3,
            avgExecutionTime: 245000,
            topFailingTests: [
                { testName: 'Login with invalid credentials', failureCount: 23, failureRate: 45.2 },
                { testName: 'Product search functionality', failureCount: 18, failureRate: 38.7 },
                { testName: 'Checkout process validation', failureCount: 15, failureRate: 32.1 }
            ],
            executionTrends: this.generateMockTrends(),
            environmentStats: {
                'dev': { executions: 450, passRate: 89.2 },
                'qa': { executions: 380, passRate: 85.7 },
                'stage': { executions: 250, passRate: 91.4 },
                'prod': { executions: 167, passRate: 94.1 }
            },
            errorDistribution: {
                'Timeout': 45,
                'Element Not Found': 32,
                'Assertion Failed': 28,
                'Network Error': 15,
                'JavaScript Error': 12,
                'Page Crash': 8,
                'Other': 23
            }
        };
    }

    getMockExecutions() {
        const executions = [];
        for (let i = 0; i < 10; i++) {
            const passRate = 70 + Math.random() * 30;
            const total = 50 + Math.floor(Math.random() * 100);
            const passed = Math.floor(total * passRate / 100);
            const failed = total - passed;
            
            executions.push({
                metadata: {
                    executionId: `exec-${Date.now()}-${i}`,
                    project: ['E-commerce', 'Banking', 'Healthcare'][Math.floor(Math.random() * 3)],
                    environment: ['dev', 'qa', 'stage', 'prod'][Math.floor(Math.random() * 4)],
                    timestamp: {
                        start: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                        duration: 180000 + Math.random() * 300000
                    }
                },
                summary: {
                    total,
                    passed,
                    failed,
                    skipped: Math.floor(Math.random() * 5),
                    passRate
                }
            });
        }
        
        return {
            executions,
            totalPages: 5,
            currentPage: 1,
            topFailingTests: this.getMockMetrics().topFailingTests
        };
    }

    generateMockTrends() {
        const trends = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            trends.push({
                date: date.toISOString().split('T')[0],
                executions: 10 + Math.floor(Math.random() * 20),
                passRate: 75 + Math.random() * 20
            });
        }
        
        return trends;
    }

    async fetchProjects() {
        // Mock implementation
        return ['E-commerce Platform', 'Banking System', 'Healthcare Portal', 'CRM Application'];
    }

    async fetchSquads() {
        // Mock implementation
        return ['QA-Automation', 'Frontend-Team', 'Backend-Team', 'DevOps-Team'];
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new TestExecutionDashboard();
});

// Global functions for HTML onclick handlers
function refreshDashboard() {
    window.dashboard.refreshDashboard();
}

function exportData() {
    window.dashboard.exportData();
}

function applyFilters() {
    window.dashboard.applyFilters();
}

function performExport() {
    window.dashboard.performExport();
}

function toggleAutoRefresh() {
    window.dashboard.toggleAutoRefresh();
}

function exportFailingTests() {
    document.getElementById('exportData').value = 'failing-tests';
    window.dashboard.exportData();
}

function exportExecutions() {
    document.getElementById('exportData').value = 'executions';
    window.dashboard.exportData();
}