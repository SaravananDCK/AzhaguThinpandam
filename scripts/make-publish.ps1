# Builds azhagu-publish.zip — everything the Hostinger VPS needs, nothing it
# doesn't (no secrets, no node_modules, no dev database, no raw photo sources).
# Run from the project root:  powershell -File scripts/make-publish.ps1
# Upload the zip to the VPS (/opt/azhagu), unzip, then follow DEPLOYMENT.md.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$out = Join-Path $root "azhagu-publish.zip"
if (Test-Path $out) { Remove-Item $out -Force }

# Windows ships bsdtar, which can write zip archives with excludes
& "$env:SystemRoot\System32\tar.exe" -a -cf $out `
  --exclude "./node_modules" `
  --exclude "./.next" `
  --exclude "./.git" `
  --exclude "./Images" `
  --exclude "./data" `
  --exclude "./backups" `
  --exclude "./uploads" `
  --exclude "./prisma/dev.db*" `
  --exclude "./.env" `
  --exclude "./azhagu-publish.zip" `
  -C $root .

$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Created azhagu-publish.zip ($size MB)"
Write-Host "Contains NO .env and NO database - set those up on the server."
