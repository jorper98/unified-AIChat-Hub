# package-for-deploy.ps1
# This script creates a deployment-ready ZIP archive of the project,
# excluding unnecessary folders like .git, node_modules, and .next.

$SourcePath = Get-Location

# Read version from package.json
$PackageJson = Get-Content -Path (Join-Path $SourcePath "package.json") -Raw | ConvertFrom-Json
$Version = $PackageJson.version

# Create deploy folder if it doesn't exist (this folder is in .gitignore)
$DeployFolder = Join-Path $SourcePath "deploy"
if (-not (Test-Path -Path $DeployFolder)) {
    New-Item -ItemType Directory -Path $DeployFolder | Out-Null
}

$DestinationPath = Join-Path $DeployFolder "unified-chat-deploy-v$Version.zip"

# Folders and files to exclude from the deployment package
# Note: 'data' and 'backups' are excluded to keep the package small. 
# Your chat history can be migrated later using the app's built-in Backup & Restore feature.
# '.kilo' is excluded as it contains local development tooling configurations.
# '.env' is excluded for security reasons. You must create it manually on the target machine.
$ExcludeFolders = @(".git", "node_modules", ".next", ".vscode", ".idea", ".kilo", "data", "backups", ".env")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Unified Chat Hub - Deployment Packager" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Source:      $SourcePath" -ForegroundColor Gray
Write-Host "Destination: $DestinationPath" -ForegroundColor Gray
Write-Host "Excluding:   $($ExcludeFolders -join ', ')" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Gray

# Get all items in the current directory, excluding the specified folders
$ItemsToInclude = Get-ChildItem -Path $SourcePath -Force | Where-Object {
    $ExcludeFolders -notcontains $_.Name
}

try {
    Write-Host "Compressing files... (this may take a moment)" -ForegroundColor Cyan
    
    # Create the ZIP archive
    Compress-Archive -Path $ItemsToInclude.FullName -DestinationPath $DestinationPath -Force
    
    # Get file size for user info
    $FileSize = (Get-Item $DestinationPath).Length / 1MB
    
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "Package created at:" -ForegroundColor White
    Write-Host "  $DestinationPath" -ForegroundColor Cyan
    Write-Host "File size: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "1. Transfer this .zip file to your target computer."
    Write-Host "2. Extract it on the target computer."
    Write-Host "3. Ensure the .env file contains your OPENROUTER_API_KEY."
    Write-Host "4. Run: docker-compose -f docker-compose.prod.yml up -d --build"
    Write-Host "==================================================" -ForegroundColor Green
}
catch {
    Write-Host "ERROR creating archive: $_" -ForegroundColor Red
}