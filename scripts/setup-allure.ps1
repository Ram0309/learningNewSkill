# PowerShell script to install Java and set up Allure reporting

Write-Host "🚀 Setting up Allure Reporting Environment..." -ForegroundColor Green

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install Java if not present
Write-Host "☕ Installing Java (required for Allure)..." -ForegroundColor Yellow
choco install openjdk11 -y

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify Java installation
Write-Host "✅ Verifying Java installation..." -ForegroundColor Green
java -version

# Install Allure CLI globally if not present
Write-Host "📊 Installing Allure CLI..." -ForegroundColor Yellow
npm install -g allure-commandline --force

Write-Host "🎉 Allure setup complete!" -ForegroundColor Green
Write-Host "📋 You can now generate Allure reports using: npm run test:allure" -ForegroundColor Cyan