# package-for-deploy.ps1
# This script creates a deployment-ready ZIP archive of the project,
# excluding unnecessary folders like .git, node_modules, and .next.
#
# Usage:
#   .\scripts\package-for-deploy.ps1             # Creates the zip file only
#   .\scripts\package-for-deploy.ps1 -Release    # Creates zip AND publishes to GitHub Releases

param (
    [switch]$Release
)

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
# 'devnotes' and files starting with 'old' are excluded as local development artifacts.
$ExcludeFolders = @(".git", "node_modules", ".vscode", ".idea", ".kilo", "data", "backups", ".env", "deploy", "devnotes")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Unified Chat Hub - Deployment Packager" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Source:      $SourcePath" -ForegroundColor Gray
Write-Host "Destination: $DestinationPath" -ForegroundColor Gray
Write-Host "Excluding:   $($ExcludeFolders -join ', ') and files starting with 'old'" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Gray

# Get all items in the current directory, excluding the specified folders and 'old*' files
$ItemsToInclude = Get-ChildItem -Path $SourcePath -Force | Where-Object {
    ($ExcludeFolders -notcontains $_.Name) -and ($_.Name -notlike 'old*')
}

# --- PRE-RELEASE BUILD CHECK ---
if ($Release) {
    Write-Host ""
    Write-Host "  Initiating Pre-Release Build Check..." -ForegroundColor Cyan
    Write-Host "--------------------------------------------------" -ForegroundColor Gray
    
    Write-Host "  Step 1: Installing dependencies (npm install)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: 'npm install' failed. Aborting release." -ForegroundColor Red
        exit 1
    }

    Write-Host "  Step 2: Compiling application (npm run build)..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: 'npm run build' failed. Aborting release due to compilation errors." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Build successful. Proceeding with packaging..." -ForegroundColor Green
    Write-Host "--------------------------------------------------" -ForegroundColor Gray
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
    if ($Release) {
        Write-Host "Proceeding to GitHub Release..." -ForegroundColor Cyan
    } else {
        Write-Host "1. Transfer this .zip file to your target computer."
        Write-Host "2. Extract it on the target computer."
        Write-Host "3. Ensure the .env file contains your OPENROUTER_API_KEY."
        Write-Host "4. Run: docker-compose -f docker-compose.prod.yml up -d --build"
    }
    Write-Host "==================================================" -ForegroundColor Green

    # --- AUTOMATED GITHUB RELEASE ---
    if ($Release) {
        Write-Host ""
        Write-Host "  Initiating GitHub Release Process..." -ForegroundColor Cyan
        Write-Host "--------------------------------------------------" -ForegroundColor Gray

        # Check if GitHub CLI is installed
        if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
            Write-Host "ERROR: GitHub CLI ('gh') is not installed or not in PATH." -ForegroundColor Red
            Write-Host "Please install it from https://cli.github.com/ and ensure you are logged in ('gh auth login')." -ForegroundColor Yellow
        } else {
            try {
                $RepoInfo = gh repo view --json name,owner -q '.owner.login + "/" + .name'
                $ReleaseTag = "v$Version"
                $ReleaseTitle = "Release v$Version"
                $ReleaseNotes = "Deployment package for Unified Chat Hub v$Version"
                
                # Check if release already exists and delete it to allow override
                $ExistingRelease = gh release view $ReleaseTag --json tagName -q '.tagName' 2>$null
                if ($ExistingRelease -eq $ReleaseTag) {
                    Write-Host "  Release '$ReleaseTag' already exists. Deleting to allow override..." -ForegroundColor Yellow
                    gh release delete $ReleaseTag --yes
                    Write-Host "  Existing release deleted successfully." -ForegroundColor Green
                }

                Write-Host "Creating release '$ReleaseTag' in repository '$RepoInfo'..." -ForegroundColor Gray
                
                # Create the new release
                gh release create $ReleaseTag --title $ReleaseTitle --notes $ReleaseNotes --latest
                
                Write-Host "Uploading archive to release..." -ForegroundColor Gray
                gh release upload $ReleaseTag $DestinationPath --clobber
                
                Write-Host "==================================================" -ForegroundColor Green
                Write-Host "  RELEASE PUBLISHED SUCCESSFULLY!" -ForegroundColor Green
                Write-Host "==================================================" -ForegroundColor Green
                Write-Host "Download URL for .env configuration:" -ForegroundColor White
                Write-Host "  https://github.com/$RepoInfo/releases/download/$ReleaseTag/$(Split-Path $DestinationPath -Leaf)" -ForegroundColor Cyan
                Write-Host "==================================================" -ForegroundColor Green
            }
            catch {
                Write-Host "ERROR during GitHub release: $_" -ForegroundColor Red
                Write-Host "Ensure you are authenticated ('gh auth login') and have push access to the repository." -ForegroundColor Yellow
            }
        }
    }
}
catch {
    Write-Host "ERROR creating archive: $_" -ForegroundColor Red
}