' ORACLUM TECH - lancador invisivel do worker de sincronizacao.
'
' O Agendador de Tarefas chama este arquivo em vez do .bat direto.
' Motivo: tarefa que executa .bat abre um console visivel a cada disparo.
' A cada 5 minutos isso seria uma janela preta piscando na sua tela o dia todo.
'
' O 0 no Run() e o window style: janela oculta.
' O True faz o script esperar o .bat terminar, para o Agendador registrar
' o codigo de saida real em vez de "sucesso" imediato.

Dim shell, aqui, bat
Set shell = CreateObject("WScript.Shell")
aqui = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
bat = aqui & "sync-worker.bat"

WScript.Quit shell.Run("""" & bat & """ once", 0, True)
