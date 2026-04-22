# Start PawHub API with SMTP + verification emails (Gmail, SendGrid, or Outlook if enabled).
#
# Gmail:
#   $env:MAIL_PASSWORD = "Your16CharAppPasswordNoSpaces"
#   $env:MAIL_USERNAME = "you@gmail.com"   # optional default below
#   $env:MAIL_HOST = "smtp.gmail.com"       # optional
#   $env:MAIL_SMTP_SSL_TRUST = "smtp.gmail.com"
#
# SendGrid (same themed HTML PawHub already builds — just reliable SMTP):
#   $env:MAIL_HOST = "smtp.sendgrid.net"
#   $env:MAIL_SMTP_SSL_TRUST = "smtp.sendgrid.net"
#   $env:MAIL_USERNAME = "apikey"
#   $env:MAIL_PASSWORD = "<SendGrid API key>"
#   $env:MAIL_FROM = "verified-sender@yourdomain.com"
#   (username must be the literal word apikey, not your email)
#
# Outlook / Microsoft 365 (often BROKEN for personal @outlook.com):
#   Error 535 5.7.139 "SmtpClientAuthentication is disabled" = Microsoft blocked basic SMTP for that mailbox.
#   Changing the app password does not fix it. Use Gmail above for local dev, or M365 admin enables SMTP AUTH.
#   If your tenant allows SMTP:
#   $env:MAIL_HOST = "smtp.office365.com"
#   $env:MAIL_SMTP_SSL_TRUST = "smtp.office365.com"
#   $env:MAIL_USERNAME = "you@yourdomain.com"
#   $env:MAIL_FROM = "you@yourdomain.com"
#   $env:MAIL_PASSWORD = "your-app-password"
#
# (optional) $env:FRONTEND_URL = "http://localhost:5173"
# Then: .\run-with-mail.ps1

$ErrorActionPreference = "Stop"
if (-not $env:MAIL_PASSWORD -or $env:MAIL_PASSWORD.Trim().Length -eq 0) {
    Write-Host "Set MAIL_PASSWORD (app password) first, e.g.:" -ForegroundColor Yellow
    Write-Host '  $env:MAIL_PASSWORD = "your-app-password"' -ForegroundColor Cyan
    exit 1
}
if (-not $env:MAIL_USERNAME) {
    $env:MAIL_USERNAME = "pawhub.help@gmail.com"
}
if (-not $env:MAIL_HOST -or $env:MAIL_HOST.Trim().Length -eq 0) {
    $env:MAIL_HOST = "smtp.gmail.com"
}
if (-not $env:MAIL_SMTP_SSL_TRUST -or $env:MAIL_SMTP_SSL_TRUST.Trim().Length -eq 0) {
    $env:MAIL_SMTP_SSL_TRUST = $env:MAIL_HOST
}
if (-not $env:MAIL_FROM -or $env:MAIL_FROM.Trim().Length -eq 0) {
    $env:MAIL_FROM = $env:MAIL_USERNAME
}
$env:PAWHUB_AUTO_VERIFY_EMAIL = "false"
Set-Location $PSScriptRoot
$mvn = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvn) {
    Write-Host "Maven (mvn) not found in PATH. Install Maven or use your IDE to run Spring Boot with these env vars:" -ForegroundColor Yellow
    Write-Host "  MAIL_PASSWORD, MAIL_USERNAME=$($env:MAIL_USERNAME), PAWHUB_AUTO_VERIFY_EMAIL=false" -ForegroundColor Cyan
    exit 1
}
& mvn spring-boot:run @args
