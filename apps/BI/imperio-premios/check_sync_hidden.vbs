' Dispara check_sync.ps1 sem abrir nenhuma janela de terminal — usado pelo
' Task Scheduler (BI-Imperio-SyncCheck, a cada 1min) em vez de chamar
' powershell.exe direto.
Set objShell = CreateObject("WScript.Shell")
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\check_sync.ps1"
objShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & scriptPath & """", 0, False
