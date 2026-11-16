' Dispara capi_realtime.ps1 sem abrir nenhuma janela de terminal — usado
' pelo Task Scheduler em vez de chamar powershell.exe direto.
Set objShell = CreateObject("WScript.Shell")
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\capi_realtime.ps1"
objShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & scriptPath & """", 0, False
