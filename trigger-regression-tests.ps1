# Trigger Regression Tests via GitHub Actions
# This script demonstrates how to trigger the regression test workflow

param(
    [string]$Environment = "prod",
    [string]$Browser = "chromium", 
    [string]$TestType = "regression",
    [string]$GitHubToken = $env:GITHUB_TOKEN
)

Write-Host "🚀 Triggering Regression Test Workflow..." -ForegroundColor Green
Write-Host "   Environment: $Environment" -ForegroundColor Cyan
Write-Host "   Browser: $Browser" -ForegroundColor Cyan
Write-Host "   Test Type: $TestType" -ForegroundColor Cyan

if (-not $GitHubToken) {
    Write-Host "❌ GitHub token not provided. Please set GITHUB_TOKEN environment variable or pass as parameter." -ForegroundColor Red
    Write-Host "   You can create a token at: https://github.com/settings/tokens" -ForegroundColor Yellow
    Write-Host "   Required permissions: repo, actions" -ForegroundColor Yellow
    exit 1
}

# GitHub API endpoint for workflow dispatch
$repoOwner = "Ram0309"
$repoName = "learningNewSkill"
$workflowFile = "regression-tests.yml"
$apiUrl = "https://api.github.com/repos/$repoOwner/$repoName/actions/workflows/$workflowFile/dispatches"

# Request body
$body = @{
    ref = "main"
    inputs = @{
        environment = $Environment
        browser = $Browser
        test_type = $TestType
    }
} | ConvertTo-Json -Depth 3

# Headers
$headers = @{
    "Authorization" = "Bearer $GitHubToken"
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/json"
}

try {
    Write-Host "📡 Sending request to GitHub Actions API..." -ForegroundColor Blue
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ Regression test workflow triggered successfully!" -ForegroundColor Green
    Write-Host "🔗 View the workflow run at: https://github.com/$repoOwner/$repoName/actions" -ForegroundColor Cyan
    
    # Wait a moment and try to get the latest run
    Start-Sleep -Seconds 3
    
    $runsUrl = "https://api.github.com/repos/$repoOwner/$repoName/actions/workflows/$workflowFile/runs"
    $runsResponse = Invoke-RestMethod -Uri $runsUrl -Headers $headers
    
    if ($runsResponse.workflow_runs -and $runsResponse.workflow_runs.Count -gt 0) {
        $latestRun = $runsResponse.workflow_runs[0]
        Write-Host "📊 Latest run details:" -ForegroundColor Magenta
        Write-Host "   Run ID: $($latestRun.id)" -ForegroundColor White
        Write-Host "   Status: $($latestRun.status)" -ForegroundColor White
        Write-Host "   URL: $($latestRun.html_url)" -ForegroundColor White
        Write-Host "   Created: $($latestRun.created_at)" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Failed to trigger workflow: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "💡 Possible issues:" -ForegroundColor Yellow
        Write-Host "   - Workflow file might not exist in the repository" -ForegroundColor White
        Write-Host "   - Repository name or owner might be incorrect" -ForegroundColor White
        Write-Host "   - Token might not have sufficient permissions" -ForegroundColor White
    } elseif ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "💡 Authentication issue:" -ForegroundColor Yellow
        Write-Host "   - Check if the GitHub token is valid" -ForegroundColor White
        Write-Host "   - Ensure token has 'repo' and 'actions' permissions" -ForegroundColor White
    }
    
    exit 1
}

Write-Host "`n📋 What happens next:" -ForegroundColor Magenta
Write-Host "   1. GitHub Actions will start the regression test workflow" -ForegroundColor White
Write-Host "   2. Tests will run in parallel across multiple shards" -ForegroundColor White
Write-Host "   3. Test execution reporting system will capture all results" -ForegroundColor White
Write-Host "   4. Reports will be generated (Excel, CSV, Allure, Dashboard)" -ForegroundColor White
Write-Host "   5. Results will be consolidated and uploaded as artifacts" -ForegroundColor White
Write-Host "   6. Notifications will be sent based on test results" -ForegroundColor White

Write-Host "`n🎯 Expected outputs:" -ForegroundColor Magenta
Write-Host "   - Comprehensive test execution reports" -ForegroundColor White
Write-Host "   - Interactive dashboard with metrics and charts" -ForegroundColor White
Write-Host "   - Allure report with detailed test results" -ForegroundColor White
Write-Host "   - SQLite database with execution history" -ForegroundColor White
Write-Host "   - Screenshots and videos for failed tests" -ForegroundColor White
Write-Host "   - GitHub Pages deployment (if on main branch)" -ForegroundColor White

Write-Host "`n✨ Monitor progress at: https://github.com/$repoOwner/$repoName/actions" -ForegroundColor Green