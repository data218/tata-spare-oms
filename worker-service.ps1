<#
.SYNOPSIS
  Manages the Tata OMS Background Worker as a Windows startup task.

.DESCRIPTION
  The local-worker.mjs process must run continuously so that any user who
  clicks "Fetch Inventory" or "Fetch Consumption" in the web dashboard has
  their request picked up and executed on this machine (which can reach the
  Tata portal - Vercel's IPs are blocked by Cloudflare).

  Run once to install:
    powershell -ExecutionPolicy Bypass -File worker-service.ps1 -Register

  Check status:
    powershell -ExecutionPolicy Bypass -File worker-service.ps1 -Status

  Remove:
    powershell -ExecutionPolicy Bypass -File worker-service.ps1 -Unregister

  Start immediately without installing:
    node local-worker.mjs

.PARAMETER Register
  Install as a Windows Task Scheduler task that starts at login.

.PARAMETER Unregister
  Remove the scheduled task.

.PARAMETER Status
  Show current task state and last run time.

.PARAMETER Start
  Start the task now (if already registered).
#>
param(
  [switch]$Register,
  [switch]$Unregister,
  [switch]$Status,
  [switch]$Start
)

$ErrorActionPreference = 'Stop'
$TaskName = 'TataOMS-Worker'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Unregister) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed task '$TaskName'."
  } else {
    Write-Host "No task named '$TaskName' found."
  }
  return
}

if ($Status) {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "Worker task is NOT registered."
    Write-Host "   Run: powershell -ExecutionPolicy Bypass -File worker-service.ps1 -Register"
    return
  }
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Task     : $($task.TaskName)"
  Write-Host "State    : $($task.State)"
  Write-Host "Next run : $($info.NextRunTime)"
  Write-Host "Last run : $($info.LastRunTime)  (result: $($info.LastTaskResult))"
  Write-Host "Output   : $(Join-Path $RepoRoot 'logs\worker-output.log')"
  Write-Host "Errors   : $(Join-Path $RepoRoot 'logs\worker-error.log')"
  return
}

if ($Start) {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "Task is not registered. Run with -Register first."
    return
  }
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Worker task started."
  return
}

if (-not $Register) {
  Write-Host ''
  Write-Host 'Tata OMS Background Worker - Task Scheduler helper'
  Write-Host ''
  Write-Host '  -Register    Install as a startup task (runs at Windows login)'
  Write-Host '  -Status      Show whether the task exists and when it last ran'
  Write-Host '  -Start       Start the task now'
  Write-Host '  -Unregister  Remove the task'
  Write-Host ''
  Write-Host 'Or run manually (no install needed):'
  Write-Host '  node local-worker.mjs'
  return
}

# -- Register ----------------------------------------------------------------
$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $RepoRoot 'local-worker.mjs'
if (-not (Test-Path $script)) { throw "Cannot find $script" }
$runner = Join-Path $RepoRoot 'worker-runner.ps1'
if (-not (Test-Path $runner)) { throw "Cannot find $runner" }
if (-not (Test-Path (Join-Path $RepoRoot 'node_modules\puppeteer'))) {
  throw 'Dependencies are missing. Run npm.cmd ci before installing the worker.'
}

$logDir = Join-Path $RepoRoot 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# The hidden supervisor keeps the task running, redirects Node output to logs,
# and restarts Node after an exit. No open PowerShell window is needed.
$logFile = Join-Path $logDir 'worker-service.log'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$action = New-ScheduledTaskAction `
  -Execute $powershell `
  -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`" -NodePath `"$node`"" `
  -WorkingDirectory $RepoRoot

# The immediate start below handles installation; later starts occur at sign-in.
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User $userId)
)

$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances   IgnoreNew `
  -ExecutionTimeLimit  ([TimeSpan]::Zero) `
  -RestartCount       3 `
  -RestartInterval    (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName
}

Register-ScheduledTask `
  -TaskName    $TaskName `
  -Action      $action `
  -Trigger     $triggers `
  -Settings    $settings `
  -Principal   $principal `
  -Description 'Tata OMS scraper worker - processes fetch jobs queued by any user in the web dashboard.' `
  -Force | Out-Null

Write-Host ''
Write-Host "Worker registered as Windows startup task: $TaskName"
Write-Host "Node: $node"
Write-Host 'It will start now and at each Windows sign-in, without an open terminal.'
Write-Host ''

# Start it immediately
Start-ScheduledTask -TaskName $TaskName
for ($attempt = 0; $attempt -lt 5; $attempt++) {
  Start-Sleep -Seconds 1
  if ((Get-ScheduledTask -TaskName $TaskName).State -eq 'Running') { break }
}
if ((Get-ScheduledTask -TaskName $TaskName).State -ne 'Running') {
  throw "The task was registered but did not stay running. Check $logFile"
}
Write-Host "Worker started. Check logs at: $logFile"
Write-Host 'You may close the manual worker terminal. The background worker will take over automatically.'
Write-Host 'Keep this PC signed in, awake and connected to the internet. Fetch requests are then picked up automatically.'
