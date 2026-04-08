# rotate-credentials.ps1
# Run from project root: .\scripts\rotate-credentials.ps1
# Generates cryptographically random passwords and writes to .env
# Open .env in VS Code after running to retrieve passwords.

$EnvFile  = ".env"
$AuthFile = "src\contexts\AuthContext.tsx"

function New-SecurePassword {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*-_=+"
    $rng   = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 20
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

$env1 = New-SecurePassword
$env2 = New-SecurePassword

@"
VITE_DEMO_EMAIL=demo@pathscribe.ai
VITE_DEMO_PASS=$env1
VITE_ADMIN_EMAIL=admin@pathscribe.ai
VITE_ADMIN_PASS=$env2
"@ | Set-Content $EnvFile -NoNewline

Write-Host ""
Write-Host "Done. Open .env in VS Code to retrieve passwords." -ForegroundColor Green
Write-Host "Never share passwords in chat or email." -ForegroundColor Yellow
Write-Host ""
