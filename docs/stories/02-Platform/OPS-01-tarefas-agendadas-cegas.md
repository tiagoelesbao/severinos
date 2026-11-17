# OPS-01: As tarefas agendadas reportam sucesso enquanto falham

**Status:** Draft
**Área:** Plataforma · infraestrutura de ETL e BI
**Prioridade:** **P1** — não quebra nada hoje, mas esconde tudo que quebrar amanhã
**Complexidade:** S — a correção é literalmente uma palavra por arquivo, em seis arquivos
**Criada por:** @aiox-master · 2026-11-17, a partir da correção do BI do Império

## Story

**Como** dono de uma operação que decide investimento de mídia pelo BI
**Eu quero** que uma tarefa agendada que falhou **apareça como falha**
**Para que** eu descubra dado velho pelo monitor, e não por desconfiar do número.

## O defeito, literal

Os seis wrappers `*_hidden.vbs` do repositório têm a mesma linha:

```vbs
objShell.Run "powershell.exe ... -File ""..."" ", 0, False
```

O terceiro argumento do `WScript.Shell.Run` é **`bWaitOnReturn`**. Com `False`, o VBScript
**dispara o PowerShell e sai imediatamente**, com código 0. O Task Scheduler registra sucesso
**antes de o trabalho começar** — e nunca vê o que acontece depois.

Os seis, conferidos em 2026-11-17:

```
apps/BI/garantido-premios/refresh_hidden.vbs
apps/BI/imperio-premios/check_sync_hidden.vbs
apps/BI/imperio-premios/refresh_hidden.vbs
services/Meta/imperio-premios/capi_initiatecheckout_hidden.vbs
services/Meta/imperio-premios/capi_realtime_hidden.vbs
services/Meta/imperio-premios/snapshot_sorteios_hidden.vbs
```

### O que torna isto pior do que parece

**O sinal existe e é jogado fora.** Cinco dos `.ps1` chamados **já** propagam código de saída —
`refresh.ps1` das duas contas, `capi_realtime.ps1`, `capi_initiatecheckout_realtime.ps1` e
`snapshot_sorteios.ps1`. O trabalho de detectar a falha **já foi feito**; é o wrapper que o
descarta.

**Já custou.** Em 2026-11-17 o refresh do BI do Império parava inteiro porque **um** anúncio em
estado ruim devolvia 400 na Graph API. O dashboard ficou dias com dado velho, e o Task Scheduler
mostrou verde o tempo todo. O agregador foi corrigido (`09279554`) — mas essa correção trata
*aquele* erro. **O próximo, de outra natureza, se esconde exatamente do mesmo jeito.**

**Não é a primeira vez nesta casa.** O mesmo padrão já nos mordeu no VEX-14, quando o pipeline de
benchmark reportava *"10 ok / 0 failed"* com **zero** vídeos capturados. A lição ali e aqui é a
mesma: **um pipeline que só sabe dizer "rodei" não é um pipeline monitorado.**

## A correção

```vbs
exitCode = objShell.Run("powershell.exe ... -File ""..."" ", 0, True)
WScript.Quit exitCode
```

`True` espera; `WScript.Quit` devolve o código ao Task Scheduler, que passa a registrar o que de
fato aconteceu.

> ⚠️ **Isto muda a duração observada da tarefa.** Hoje ela "termina" em milissegundos; depois vai
> durar o tempo real do trabalho. Se alguma tarefa tiver **limite de execução** configurado no Task
> Scheduler, ela pode passar a ser **morta no meio** — algo que o `False` escondia. Verificar o
> limite de cada uma faz parte da correção, não é efeito colateral a descobrir depois.

## Tarefas (Checklist)

- [ ] Os seis wrappers esperam e propagam o código de saída.
- [ ] Conferir, para cada tarefa no Task Scheduler, o **limite de execução** e ajustá-lo ao tempo
      real medido.
- [ ] Os `.ps1` que ainda não propagam passam a propagar.
- [ ] `[CONFIRMAR]` se existe algum wrapper equivalente **fora** do repositório, criado à mão no
      agendador.

## Critérios de Aceite

- [ ] **AC1 (falha vira falha):** tarefa cujo `.ps1` sai com código diferente de zero aparece no
      Task Scheduler com **resultado diferente de zero**. Teste: forçar erro no script e conferir o
      último resultado da tarefa.
- [ ] **AC2 (sucesso continua sucesso):** execução normal registra **0**. É a regressão que impede
      a correção de criar alarme falso — pior que não alarmar.
- [ ] **AC3 (nenhuma janela aparece):** o motivo de o wrapper existir é não abrir terminal.
      Conferir que com `True` a janela continua oculta.
- [ ] **AC4 (a duração real cabe no limite):** para cada uma das seis, a duração medida é **menor**
      que o limite configurado. Onde não for, o limite é ajustado e o novo valor registrado.
- [ ] **AC5 (os seis, não cinco):** varredura `grep -l ", 0, False" **/*_hidden.vbs` não devolve
      nada.

## Escopo

**IN:** os seis wrappers; propagação de código nos `.ps1`; conferência dos limites de execução.

**OUT:** alerta ativo quando uma tarefa falha (notificação, e-mail, painel) — é o passo seguinte e
merece decisão própria: **isto aqui só faz a falha ser visível; não faz ninguém olhar.** Também
fora: migrar do Task Scheduler para outro agendador.

## Riscos

- **[Médio] Tarefa com limite de execução curto passa a ser morta.** O `False` escondia isso. AC4
  existe por causa disto, e é o único risco real da mudança.
- **[Baixo] Alarme falso.** Se algum `.ps1` sai com código não-zero em situação normal, a correção
  transforma ruído em falha. AC2 cobre.

## Por que isto não é urgente, e mesmo assim importa

Nada quebra hoje por causa deste defeito. O que ele faz é **garantir que o próximo problema demore
dias para ser notado** — e a operação do Império movimenta ~R$ 90 mil/dia decidindo mídia por esses
números. O custo de consertar é uma palavra em seis arquivos; o custo de não consertar já foi pago
uma vez.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do achado durante a correção do agregador do BI (`09279554`): a task reportava sucesso enquanto falhava. | @aiox-master |
