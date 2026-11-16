' Dispara snapshot_sorteios.ps1 sem abrir nenhuma janela de terminal — usado
' pelo Task Scheduler em vez de chamar powershell.exe direto (que mostra
' janela mesmo com -WindowStyle Hidden em algumas versões do Windows).
Set objShell = CreateObject("WScript.Shell")
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\snapshot_sorteios.ps1"
objShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & scriptPath & """", 0, False
