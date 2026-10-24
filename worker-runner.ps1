# Task Scheduler runs this supervisor hidden. It keeps Node alive independently
# of any terminal window and preserves the latest worker output for diagnosis.
param([Parameter(Mandatory = $true)][string]$NodePath)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkerScript = Join-Path $RepoRoot 'local-worker.mjs'
$LogDir = Join-Path $RepoRoot 'logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$SupervisorLog = Join-Path $LogDir 'worker-service.log'
$OutputLog = Join-Path $LogDir 'worker-output.log'
$ErrorLog = Join-Path $LogDir 'worker-error.log'

if (-not (Test-Path -LiteralPath $NodePath)) { throw "Node.js was not found at $NodePath" }
if (-not (Test-Path -LiteralPath $WorkerScript)) { throw "Worker was not found at $WorkerScript" }

while ($true) {
  try {
    Add-Content -LiteralPath $SupervisorLog -Value "$(Get-Date -Format o) Starting background worker."
    $child = Start-Process -FilePath $NodePath `
      -ArgumentList "`"$WorkerScript`"" `
      -WorkingDirectory $RepoRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $OutputLog `
      -RedirectStandardError $ErrorLog `
      -PassThru -Wait
    Add-Content -LiteralPath $SupervisorLog -Value "$(Get-Date -Format o) Worker exited with code $($child.ExitCode); restarting in 10 seconds."
  } catch {
    Add-Content -LiteralPath $SupervisorLog -Value "$(Get-Date -Format o) Worker launch failed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 10
}
