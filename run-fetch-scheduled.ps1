<#
.SYNOPSIS
  Runs the Tata BI fetch on a schedule from this machine.

.DESCRIPTION
  Vercel's shared egress IPs are blocked by the Cloudflare layer in front of the
  Tata BI portal, so the serverless /api/sync can never load the login page. This
  wrapper runs run-fetch.mjs on a machine whose network the portal allows, and
  publishes progress to the same Supabase row the dashboard reads.

  Run this once to register a daily 05:00 task:

    powershell -ExecutionPolicy Bypass -File run-fetch-scheduled.ps1 -Register

  Remove it later:

    powershell -ExecutionPolicy Bypass -File run-fetch-scheduled.ps1 -Unregister

.PARAMETER Time
  Time of day to run, 24h HH:mm. Defaults to 05:00.

.PARAMETER Register
  Create the scheduled task.

.PARAMETER Unregister
  Delete the scheduled task.

.PARAMETER Status
  Show whether the task exists and when it last ran.
#>
param(
  [string]$Time = '05:00',
  [switch]$Register,
  [switch]$Unregister,
  [switch]$Status,
  [ValidateSet('all', 'consumption', 'inventory')]
  [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$TaskName = 'TataBI-Fetch'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Unregister) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task '$TaskName'."
  } else {
    Write-Host "No scheduled task named '$TaskName'."
  }
  return
}

if ($Status) {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) { Write-Host "Not registered."; return }
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Task     : $($task.TaskName)"
  Write-Host "State    : $($task.State)"
  Write-Host "Next run : $($info.NextRunTime)"
  Write-Host "Last run : $($info.LastRunTime) (result $($info.LastTaskResult))"
  return
}

if (-not $Register) {
  Write-Host 'Nothing to do. Pass -Register, -Unregister or -Status.'
  Write-Host '  -Register    schedule the daily fetch'
  Write-Host '  -Status      show the current schedule and last result'
  Write-Host '  -Unregister  remove the schedule'
  return
}

if ($Time -notmatch '^([01]\d|2[0-3]):([0-5]\d)$') {
  throw "Invalid -Time '$Time'. Use 24-hour HH:mm, for example 05:00."
}

$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $RepoRoot 'run-fetch.mjs'
if (-not (Test-Path $script)) { throw "Cannot find $script" }

# Node is invoked directly rather than through cmd.exe: wrapping a path with spaces
# in cmd /c "..." strips the inner quotes and node then tries to load a module whose
# name ends in a stray quote. run-fetch.mjs writes logs/log-YYYY-MM-DD.log itself.
$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "`"$script`" $Target" `
  -WorkingDirectory $RepoRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -StartWhenAvailable `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Fetches Tata BI consumption and inventory data into Supabase.' -Force | Out-Null

Write-Host "Registered '$TaskName' to run daily at $Time."
Write-Host "  node    : $node"
Write-Host "  script  : $script"
Write-Host "  target  : $Target"
Write-Host '  logs    : logs\fetch-YYYY-MM-DD.log'
Write-Host 'The machine must be on and connected to the network at that time.'
Write-Host 'If it was off, the task runs at the next sign-in (StartWhenAvailable).'
