param(
  [Parameter(Mandatory = $true)][string]$GatewayUrl,
  [Parameter(Mandatory = $true)][string]$PairingCode,
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "CareerOS")
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command([string]$Name, [string]$Help) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "$Name is required. $Help" }
}

Require-Command node "Install Node.js 24.13.1."
Require-Command npm "Install npm with Node.js."
Require-Command git "Install Git for Windows."
Require-Command codex "Install and sign in to Codex CLI."
Require-Command latexmk "Install MiKTeX and enable latexmk."

$nodeVersion = (& node --version).TrimStart("v")
if ($nodeVersion -ne "24.13.1") { throw "Career OS requires Node 24.13.1; found $nodeVersion." }
$codexVersion = (& codex --version).Trim()
if ($codexVersion -ne "codex-cli 0.120.0") { throw "Career OS requires the tested Codex App Server protocol from codex-cli 0.120.0; found $codexVersion." }
& codex login status | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Codex CLI is installed but not authenticated. Run codex login first." }
$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chromePath) { throw "Google Chrome is required." }

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
$sourceRoot = Join-Path $InstallRoot "runtime"
$workspaceRoot = Join-Path $InstallRoot "workspace"
$logsRoot = Join-Path $InstallRoot "logs"
New-Item -ItemType Directory -Force -Path $InstallRoot,$workspaceRoot,$logsRoot,(Join-Path $InstallRoot "chrome-profile") | Out-Null

# Install an isolated runtime copy so the scheduled worker never depends on the
# repository checkout, OneDrive availability, or a developer terminal.
if (Test-Path -LiteralPath $sourceRoot) {
  $resolvedInstall = [System.IO.Path]::GetFullPath($InstallRoot)
  $resolvedRuntime = [System.IO.Path]::GetFullPath($sourceRoot)
  if (-not $resolvedRuntime.StartsWith($resolvedInstall + [System.IO.Path]::DirectorySeparatorChar)) { throw "Refusing to replace runtime outside the Career OS install root." }
  Remove-Item -LiteralPath $resolvedRuntime -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $sourceRoot,(Join-Path $sourceRoot "apps"),(Join-Path $sourceRoot "packages") | Out-Null
Copy-Item -LiteralPath (Join-Path $repositoryRoot "package.json"),(Join-Path $repositoryRoot "package-lock.json"),(Join-Path $repositoryRoot "tsconfig.base.json") -Destination $sourceRoot
Copy-Item -LiteralPath (Join-Path $repositoryRoot "apps\worker") -Destination (Join-Path $sourceRoot "apps") -Recurse
Copy-Item -LiteralPath (Join-Path $repositoryRoot "packages\core") -Destination (Join-Path $sourceRoot "packages") -Recurse
Copy-Item -LiteralPath (Join-Path $repositoryRoot "packages\db") -Destination (Join-Path $sourceRoot "packages") -Recurse
Copy-Item -LiteralPath (Join-Path $repositoryRoot "career-os-agents") -Destination $sourceRoot -Recurse
Push-Location $sourceRoot
try {
  & npm ci --workspace @career-os/worker --include-workspace-root
  if ($LASTEXITCODE -ne 0) { throw "Worker dependency installation failed." }
} finally { Pop-Location }

$env:CAREER_OS_GATEWAY_URL = $GatewayUrl.TrimEnd("/")
$env:CAREER_OS_DATA_DIR = $env:LOCALAPPDATA
Push-Location $sourceRoot
try {
  & npm --workspace @career-os/worker run dev -- --pair $PairingCode
  if ($LASTEXITCODE -ne 0) { throw "Worker pairing failed." }
} finally { Pop-Location }

$runner = @"
`$ErrorActionPreference = "Stop"
`$env:CAREER_OS_GATEWAY_URL = "$($GatewayUrl.TrimEnd('/'))"
`$env:CAREER_OS_DATA_DIR = "$env:LOCALAPPDATA"
Set-Location -LiteralPath "$sourceRoot"
& npm --workspace @career-os/worker run dev *>> "$(Join-Path $logsRoot 'worker.log')"
"@
$runnerPath = Join-Path $InstallRoot "run-worker.ps1"
[System.IO.File]::WriteAllText($runnerPath, $runner, [System.Text.UTF8Encoding]::new($false))

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runnerPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "Career OS Worker" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName "Career OS Worker"
Start-Process -FilePath $chromePath -ArgumentList @("--user-data-dir=`"$(Join-Path $InstallRoot 'chrome-profile')`"", "https://www.instagram.com/")
Write-Output "Career OS worker installed, paired, and started. A dedicated Chrome profile was opened so you can sign in to configured sources."
