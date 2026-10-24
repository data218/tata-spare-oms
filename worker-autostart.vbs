' Starts the Tata OMS scraper worker hidden at Windows login.
' Legacy launcher. Prefer npm run worker:install for a supervised startup task.
' Resolve this checkout or accept an explicit run-worker.cmd path as argument.
Set sh = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
If WScript.Arguments.Count > 0 Then
  target = WScript.Arguments(0)
Else
  target = fs.BuildPath(fs.GetParentFolderName(WScript.ScriptFullName), "run-worker.cmd")
End If
If Not fs.FileExists(target) Then
  MsgBox "Worker launcher not found. Run npm.cmd run worker:install in your Tata OMS project folder.", 16, "Tata OMS"
  WScript.Quit 1
End If
sh.Run """" & target & """", 0, False
