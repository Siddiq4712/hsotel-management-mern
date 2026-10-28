param(
  [ValidatePattern('^[a-zA-Z0-9_.]+$')][string]$Package = 'com.yourname.hostelmanagement',
  [ValidateRange(10, 60)][int]$Seconds = 30,
  [string]$Serial = '',
  [string]$AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $AdbPath)) { throw 'ADB was not found. Pass -AdbPath with its full path.' }
$deviceArgs = if ($Serial) { @('-s', $Serial) } else { @() }
$installed = & $AdbPath @deviceArgs shell pm path $Package
if ($LASTEXITCODE -ne 0 -or !$installed) { throw "Install $Package on the target device first. For Expo Go pass -Package host.exp.exponent." }
& $AdbPath @deviceArgs shell dumpsys gfxinfo $Package reset | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not reset frame statistics.' }
Write-Host "Use the app for $Seconds seconds: scroll long histories and switch tabs."
Start-Sleep -Seconds $Seconds
$frames = & $AdbPath @deviceArgs shell dumpsys gfxinfo $Package
if ($LASTEXITCODE -ne 0) { throw 'Could not read frame statistics.' }
$memory = & $AdbPath @deviceArgs shell dumpsys meminfo $Package
$directory = Join-Path $PSScriptRoot '..\.expo\performance-reports'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$report = Join-Path $directory ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $Package + '.txt')
@("Package: $Package", "Sample duration: $Seconds seconds", 'Native Android frame metrics; these do not measure JavaScript FPS.', '', $frames, '', $memory) |
  Set-Content -LiteralPath $report
$frames | Select-String -Pattern 'Total frames|Janky frames|percentile|Missed Vsync|Slow UI|Slow bitmap|Slow issue'
Write-Host "Saved $report"
