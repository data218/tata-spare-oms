<#
.SYNOPSIS
  Runs the Tata BI fetch on a schedule from this machine.

.DESCRIPTION
  Vercel's shared egress IPs are blocked by the Cloudflare layer in front of the
  Tata BI portal, so the serverless /api/sync can never load the login page. The
  actual scraping is done by local-worker.mjs (running 24/7 on this machine).

  This task does NOT scrape. At the scheduled time it runs enqueue-daily.mjs,
  which only writes a `pending` job into the same Supabase row the dashboard
  reads. Because that is the SAME queue a manual "Fetch" uses, the daily run and
  any manual fetch are merged by the single worker and never collide.

  Run this once to register a daily 05:00 task:

    powershell -ExecutionPolicy Bypass -File run-fetch-scheduled.ps1 -Register

  Remove it later:

    powershell -ExecutionPolicy Bypass -File run-fetch-scheduled.ps1 -Unregister

.PARAMETER Time
  Time of day to run, 24h HH:mm. Defaults to 10:00.

.PARAMETER Register
  Create the scheduled task.

.PARAMETER Unregister
  Delete the scheduled task.

.PARAMETER Status
  Show whether the task exists and when it last ran.
#>
param(
  [string]$Time = '10:00',
  [switch]$Register,
  [switch]$Unregister,
  [switch]$Status
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
$script = Join-Path $RepoRoot 'enqueue-daily.mjs'
if (-not (Test-Path $script)) { throw "Cannot find $script" }

# Node is invoked directly rather than through cmd.exe: wrapping a path with spaces
# in cmd /c "..." strips the inner quotes and node then tries to load a module whose
# name ends in a stray quote. enqueue-daily.mjs appends to logs/fetch-YYYY-MM-DD.log.
$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "`"$script`"" `
  -WorkingDirectory $RepoRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -StartWhenAvailable `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Queues the daily Tata BI consumption + inventory fetch; the local worker executes it.' -Force | Out-Null

Write-Host "Registered '$TaskName' to queue the daily fetch at $Time."
Write-Host "  node    : $node"
Write-Host "  script  : $script"
Write-Host '  logs    : logs\fetch-YYYY-MM-DD.log'
Write-Host 'The machine must be on and connected to the network at that time.'
Write-Host 'If it was off, the task runs at the next sign-in (StartWhenAvailable).'
Write-Host 'The local worker (local-worker.mjs) must be running to execute the queued job.'
