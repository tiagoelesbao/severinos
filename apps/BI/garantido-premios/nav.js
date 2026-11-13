async function injetarNav(paginaAtiva) {
  const res = await fetch('nav.html?t=' + Date.now());
  const html = await res.text();
  document.getElementById('nav-slot').outerHTML = html;
  const link = document.querySelector(`.bi-nav a[data-page="${paginaAtiva}"]`);
  if (link) link.classList.add('ativo');
}

// Sem botão "Sincronizar agora"/"Pausar pontos de contato" aqui — esses
// existem no BI do Império porque client_api.py faz LOGIN na plataforma do
// cliente (sessão que pode colidir com o founder usando o painel na mão).
// O pipeline da Garantido hoje só usa token do Meta + Supabase, nenhum
// login humano envolvido — não há nada pra pausar. Se pull_pedidos() virar
// real via login (client_api.py adaptado), portar os dois botões junto.

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
