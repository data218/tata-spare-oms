' Starts the Tata OMS scraper worker hidden at Windows login.
' A copy of this file lives in the user's Startup folder so the dashboard
' "Fetch Inventory" / "Fetch Consumption" buttons always have an executor.
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\Users\HP\Desktop\tata-spare-oms\run-worker.cmd""", 0, False
