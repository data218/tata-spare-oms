<#
.SYNOPSIS
  Manages the Tata OMS Background Worker as a Windows startup task.

.DESCRIPTION
  The local-worker.mjs process must run continuously so that any user who
  clicks "Fetch Inventory" or "Fetch Consumption" in the web dashboard has
  their request picked up and executed on this machine (which can reach the
  Tata portal — Vercel's IPs are blocked by Cloudflare).

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
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "✅ Removed task '$TaskName'."
  } else {
    Write-Host "No task named '$TaskName' found."
  }
  return
}

if ($Status) {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "❌ Worker task is NOT registered."
    Write-Host "   Run: powershell -ExecutionPolicy Bypass -File worker-service.ps1 -Register"
    return
  }
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Task     : $($task.TaskName)"
  Write-Host "State    : $($task.State)"
  Write-Host "Next run : $($info.NextRunTime)"
  Write-Host "Last run : $($info.LastRunTime)  (result: $($info.LastTaskResult))"
  return
}

if ($Start) {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "Task is not registered. Run with -Register first."
    return
  }
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "✅ Worker task started."
  return
}

if (-not $Register) {
  Write-Host ''
  Write-Host 'Tata OMS Background Worker — Task Scheduler helper'
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

# ── Register ────────────────────────────────────────────────────────────────
$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $RepoRoot 'local-worker.mjs'
if (-not (Test-Path $script)) { throw "Cannot find $script" }

$logDir = Join-Path $RepoRoot 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# Wrap in a cmd that redirects output to a log file
$logFile = Join-Path $logDir 'worker-service.log'
$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "`"$script`"" `
  -WorkingDirectory $RepoRoot

# Trigger: at user logon + immediately when registered
$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn),
  (New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(5))
)

$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances   IgnoreNew `
  -ExecutionTimeLimit  ([TimeSpan]::Zero) `
  -RestartCount       3 `
  -RestartInterval    (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName    $TaskName `
  -Action      $action `
  -Trigger     $triggers `
  -Settings    $settings `
  -Principal   $principal `
  -Description 'Tata OMS scraper worker — processes fetch jobs queued by any user in the web dashboard.' `
  -Force | Out-Null

Write-Host ''
Write-Host '╔══════════════════════════════════════════════════════════╗'
Write-Host "║  ✅  Worker registered as Windows startup task           ║"
Write-Host '╠══════════════════════════════════════════════════════════╣'
Write-Host "║  Task name : $TaskName"
Write-Host "║  Node      : $node"
Write-Host "║  Script    : local-worker.mjs"
Write-Host '║                                                          ║'
Write-Host '║  The task will start NOW and at every Windows login.     ║'
Write-Host '║  Any user who clicks Fetch in the web app will have      ║'
Write-Host '║  their request processed automatically.                  ║'
Write-Host '╚══════════════════════════════════════════════════════════╝'
Write-Host ''

# Start it immediately
Start-ScheduledTask -TaskName $TaskName
Write-Host "Worker started. Check logs at: $logFile"
