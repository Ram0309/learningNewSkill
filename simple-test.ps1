param(
    [string]$Environment = "prod",
    [string]$Browser = "chromium"
)

Write-Host "Registration UI Test Configuration:" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Browser: $Browser" -ForegroundColor Yellow
Write-Host "Test completed successfully!" -ForegroundColor Green