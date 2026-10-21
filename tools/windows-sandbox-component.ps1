param([switch]$EnableComponent, [Parameter(Mandatory=$true)][string]$ReportPath)
$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath $ReportPath) { throw 'Existing report cannot be overwritten' }
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$report = [ordered]@{ kind='WINDOWS_SANDBOX_COMPONENT'; admin=$isAdmin; enable_requested=[bool]$EnableComponent; status='NOT_RUN'; automatic_restart=$false }
try {
    if (-not $isAdmin) { throw 'ADMINISTRATOR_REQUIRED' }
    $feature = Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM
    $report.before = [string]$feature.State
    if ($EnableComponent -and $feature.State -ne 'Enabled') {
        $result = Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All -NoRestart
        $report.restart_needed = [bool]$result.RestartNeeded
        $report.status = if ($result.RestartNeeded) { 'RESTART_REQUIRED' } else { 'ENABLED' }
    } else { $report.status = if ($feature.State -eq 'Enabled') { 'ENABLED' } else { 'DISABLED' } }
} catch { $report.status='BLOCKED'; $report.error=$_.Exception.Message }
$json = $report | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText([IO.Path]::GetFullPath($ReportPath), $json, [Text.UTF8Encoding]::new($false))
Write-Output $json
if ($report.status -eq 'BLOCKED') { exit 2 }
