async function injetarNav(paginaAtiva) {
  const res = await fetch('nav.html?t=' + Date.now());
  const html = await res.text();
  document.getElementById('nav-slot').outerHTML = html;
  const link = document.querySelector(`.bi-nav a[data-page="${paginaAtiva}"]`);
  if (link) link.classList.add('ativo');
  iniciarBotaoSync();
  iniciarBotaoPause();
}

// Botão "Sincronizar agora" — grava um sinal no Supabase Storage (api/solicitar-sync.js);
// uma tarefa agendada local (BI-Imperio-SyncCheck, a cada 1min) lê o sinal e dispara
// o refresh de verdade (puxa API do cliente + Meta Ads + redeploy). Aqui só pedimos
// e ficamos de olho (poll) até o sinal indicar que terminou.
function iniciarBotaoSync() {
  const btn = document.getElementById('btn-sync');
  const status = document.getElementById('sync-status');
  if (!btn) return;

  let polling = null;
  const pararPolling = () => { if (polling) { clearInterval(polling); polling = null; } };
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  function iniciarPolling(solicitadoEm) {
    pararPolling();
    const inicio = Date.now();
    polling = setInterval(async () => {
      if (Date.now() - inicio > 8 * 60 * 1000) {
        pararPolling();
        btn.disabled = false;
        status.textContent = 'Ainda processando — atualize a página em alguns minutos.';
        return;
      }
      try {
        const res = await fetch('/api/solicitar-sync');
        const d = await res.json();
        const terminou = !d.requested && d.last_synced_at && new Date(d.last_synced_at) > new Date(solicitadoEm);
        if (terminou) {
          pararPolling();
          btn.disabled = false;
          status.textContent = `✓ Atualizado às ${hora(d.last_synced_at)} — recarregue a página pra ver os dados novos.`;
        }
      } catch { /* próxima tentativa do polling cobre falha pontual de rede */ }
    }, 15000);
  }

  (async () => {
    try {
      const res = await fetch('/api/solicitar-sync');
      const d = await res.json();
      if (d.requested) {
        btn.disabled = true;
        status.textContent = 'Sincronizando (pedido de outra aba/dispositivo)...';
        iniciarPolling(d.requested_at);
      } else if (d.last_synced_at) {
        status.textContent = `Última sinc. manual: ${hora(d.last_synced_at)}`;
      }
    } catch { /* sem status inicial, botão fica disponível normalmente */ }
  })();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Solicitando...';
    try {
      const res = await fetch('/api/solicitar-sync', { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        status.textContent = `Solicitado às ${hora(d.solicitado_em)} — pode levar alguns minutos.`;
        iniciarPolling(d.solicitado_em);
      } else {
        status.textContent = d.erro || 'Erro ao solicitar.';
        btn.disabled = false;
      }
    } catch (e) {
      status.textContent = 'Erro de conexão: ' + e.message;
      btn.disabled = false;
    }
  });
}

// Botão "Pausar pontos de contato" — pedido 2026-10-24 (founder: login
// automático dos 5 jobs agendados derrubava a sessão manual dele no painel
// da plataforma durante teste). Liga/desliga a flag `bi_paused` no Edge
// Config (api/toggle-pause.js) — lida por `client_api.py::is_paused()`
// DENTRO de `login()`, então os jobs agendados (CAPI/BI/Catálogo) continuam
// disparando no horário normal, só não conseguem logar enquanto pausado —
// não precisa desativar nenhuma Scheduled Task do Windows.
function iniciarBotaoPause() {
  const btn = document.getElementById('btn-pause');
  const status = document.getElementById('pause-status');
  if (!btn) return;

  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  function aplicarEstado(d) {
    if (d.paused) {
      btn.textContent = '▶ Reativar pontos de contato';
      btn.classList.add('pausado');
      status.textContent = d.paused_at ? `Pausado desde ${hora(d.paused_at)}` : 'Pausado';
    } else {
      btn.textContent = '⏸ Pausar pontos de contato';
      btn.classList.remove('pausado');
      status.textContent = '';
    }
  }

  (async () => {
    try {
      const res = await fetch('/api/toggle-pause');
      const d = await res.json();
      if (res.ok) aplicarEstado(d);
    } catch { /* sem status inicial, botão fica no padrão "ativo" */ }
  })();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const pausarAgora = !btn.classList.contains('pausado');
    try {
      const res = await fetch('/api/toggle-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: pausarAgora }),
      });
      const d = await res.json();
      if (res.ok) {
        aplicarEstado(d);
      } else {
        status.textContent = d.erro || 'Erro ao atualizar.';
      }
    } catch (e) {
      status.textContent = 'Erro de conexão: ' + e.message;
    } finally {
      btn.disabled = false;
    }
  });
}

function formatBRL(v) {
  if (v === null || v === undefined) return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNum(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR');
}

function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
