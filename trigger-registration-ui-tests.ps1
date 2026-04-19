# PowerShell script to trigger Registration UI regression tests
# This script can be used to manually trigger the Registration UI test workflow

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "sit", "preprod", "prod")]
    [string]$Environment = "prod",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("chromium", "firefox", "webkit", "all")]
    [string]$Browser = "chromium",
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubToken = $env:GITHUB_TOKEN,
    
    [Parameter(Mandatory=$false)]
    [string]$Repository = "Ram0309/learningNewSkill",
    
    [Parameter(Mandatory=$false)]
    [switch]$WaitForCompletion = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$OpenResults = $false
)

# Colors for console output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "🎯 Registration UI Regression Test Trigger" -ForegroundColor $Cyan
Write-Host "=========================================" -ForegroundColor $Cyan

# Validate GitHub token
if (-not $GitHubToken) {
    Write-Host "❌ Error: GitHub token not provided. Set GITHUB_TOKEN environment variable or use -GitHubToken parameter." -ForegroundColor $Red
    Write-Host "💡 You can create a token at: https://github.com/settings/tokens" -ForegroundColor $Yellow
    exit 1
}

# Display configuration
Write-Host "📋 Configuration:" -ForegroundColor $Cyan
Write-Host "  Repository: $Repository" -ForegroundColor $Yellow
Write-Host "  Environment: $Environment" -ForegroundColor $Yellow
Write-Host "  Browser: $Browser" -ForegroundColor $Yellow
Write-Host "  Wait for completion: $WaitForCompletion" -ForegroundColor $Yellow
Write-Host ""

# Prepare API request
$headers = @{
    "Authorization" = "Bearer $GitHubToken"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "PowerShell-RegistrationUI-TestTrigger"
}

$body = @{
    "ref" = "main"
    "inputs" = @{
        "environment" = $Environment
        "browser" = $Browser
    }
} | ConvertTo-Json

$uri = "https://api.github.com/repos/$Repository/actions/workflows/registration-ui-regression.yml/dispatches"

try {
    Write-Host "🚀 Triggering Registration UI regression tests..." -ForegroundColor $Green
    
    # Trigger the workflow
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Registration UI test workflow triggered successfully!" -ForegroundColor $Green
    Write-Host ""
    
    # Get the latest workflow run
    Start-Sleep -Seconds 3
    $runsUri = "https://api.github.com/repos/$Repository/actions/workflows/registration-ui-regression.yml/runs?per_page=1"
    $runsResponse = Invoke-RestMethod -Uri $runsUri -Method GET -Headers $headers
    
    if ($runsResponse.workflow_runs.Count -gt 0) {
        $latestRun = $runsResponse.workflow_runs[0]
        $runId = $latestRun.id
        $runUrl = $latestRun.html_url
        $runStatus = $latestRun.status
        
        Write-Host "📊 Workflow Details:" -ForegroundColor $Cyan
        Write-Host "  Run ID: $runId" -ForegroundColor $Yellow
        Write-Host "  Status: $runStatus" -ForegroundColor $Yellow
        Write-Host "  URL: $runUrl" -ForegroundColor $Yellow
        Write-Host ""
        
        if ($OpenResults) {
            Write-Host "🌐 Opening workflow results in browser..." -ForegroundColor $Green
            Start-Process $runUrl
        }
        
        if ($WaitForCompletion) {
            Write-Host "⏳ Waiting for Registration UI tests to complete..." -ForegroundColor $Yellow
            Write-Host "   This may take 10-15 minutes depending on test scope" -ForegroundColor $Yellow
            Write-Host ""
            
            do {
                Start-Sleep -Seconds 30
                $runDetailsUri = "https://api.github.com/repos/$Repository/actions/runs/$runId"
                $runDetails = Invoke-RestMethod -Uri $runDetailsUri -Method GET -Headers $headers
                $currentStatus = $runDetails.status
                $conclusion = $runDetails.conclusion
                
                $timestamp = Get-Date -Format "HH:mm:ss"
                Write-Host "[$timestamp] Status: $currentStatus" -ForegroundColor $Yellow
                
                if ($currentStatus -eq "completed") {
                    Write-Host ""
                    if ($conclusion -eq "success") {
                        Write-Host "✅ Registration UI tests completed successfully!" -ForegroundColor $Green
                        
                        # Get artifacts
                        $artifactsUri = "https://api.github.com/repos/$Repository/actions/runs/$runId/artifacts"
                        $artifacts = Invoke-RestMethod -Uri $artifactsUri -Method GET -Headers $headers
                        
                        Write-Host "📁 Generated Artifacts:" -ForegroundColor $Cyan
                        foreach ($artifact in $artifacts.artifacts) {
                            $sizeInMB = [math]::Round($artifact.size_in_bytes / 1MB, 2)
                            Write-Host "  - $($artifact.name) ($sizeInMB MB)" -ForegroundColor $Yellow
                        }
                        
                        # Check if GitHub Pages report is available
                        $pagesUrl = "https://ram0309.github.io/learningNewSkill/registration-ui-reports/$($runDetails.run_number)/"
                        Write-Host ""
                        Write-Host "📊 Reports Available:" -ForegroundColor $Cyan
                        Write-Host "  - Allure Report: $pagesUrl" -ForegroundColor $Yellow
                        Write-Host "  - Artifacts: $runUrl" -ForegroundColor $Yellow
                        
                    } elseif ($conclusion -eq "failure") {
                        Write-Host "❌ Registration UI tests failed!" -ForegroundColor $Red
                        Write-Host "🔍 Check the workflow logs for details: $runUrl" -ForegroundColor $Yellow
                        
                        # Get failed jobs
                        $jobsUri = "https://api.github.com/repos/$Repository/actions/runs/$runId/jobs"
                        $jobs = Invoke-RestMethod -Uri $jobsUri -Method GET -Headers $headers
                        
                        Write-Host ""
                        Write-Host "❌ Failed Jobs:" -ForegroundColor $Red
                        foreach ($job in $jobs.jobs) {
                            if ($job.conclusion -eq "failure") {
                                Write-Host "  - $($job.name): $($job.conclusion)" -ForegroundColor $Red
                            }
                        }
                        
                    } else {
                        Write-Host "⚠️ Registration UI tests completed with status: $conclusion" -ForegroundColor $Yellow
                    }
                    break
                }
            } while ($currentStatus -in @("queued", "in_progress"))
        } else {
            Write-Host "🔗 Monitor progress at: $runUrl" -ForegroundColor $Green
        }
    }
    
} catch {
    Write-Host "❌ Error triggering Registration UI tests:" -ForegroundColor $Red
    Write-Host $_.Exception.Message -ForegroundColor $Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor $Red
        
        if ($statusCode -eq 401) {
            Write-Host "💡 Check your GitHub token permissions. It needs 'actions:write' scope." -ForegroundColor $Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "💡 Check the repository name and workflow file path." -ForegroundColor $Yellow
        }
    }
    exit 1
}

Write-Host ""
Write-Host "🎯 Registration UI Test Summary:" -ForegroundColor $Cyan
Write-Host "  - Focus: Registration UI scenarios only (@regression @ui)" -ForegroundColor $Yellow
Write-Host "  - Coverage: Form validation, UI/UX, Security, Performance, Accessibility" -ForegroundColor $Yellow
Write-Host "  - Browsers: $Browser" -ForegroundColor $Yellow
Write-Host "  - Environment: $Environment" -ForegroundColor $Yellow
Write-Host "  - Parallel execution with 2 shards per browser" -ForegroundColor $Yellow
Write-Host "  - Comprehensive reporting: Allure, Excel, Dashboard, SQLite" -ForegroundColor $Yellow
Write-Host ""
Write-Host "✨ Registration UI regression tests are now running!" -ForegroundColor $Green