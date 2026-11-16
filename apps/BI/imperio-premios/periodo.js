// Filtro de período compartilhado (Executiva + Operacional + Produto) —
// presets rápidos + range customizado via calendário nativo (dois
// <input type="date">, cobre "dia único" selecionando a mesma data nos dois
// campos). Pedido 2026-10-07.
//
// 2026-10-08: presets "Ontem" e "Últimos 30 dias" adicionados AQUI, no
// componente compartilhado, e não só na página que pediu (Produto) — as três
// páginas que usam este arquivo ganham os dois presets de graça, sem
// duplicar a lógica de limites de data em cada HTML. O parâmetro opcional
// `presets` permite a uma página escolher um subconjunto (ex.: uma página sem
// campanha de Ads não precisa do preset "desde o início da campanha") sem
// quebrar quem não passa nada: o default é a lista inteira, mesma ordem
// cronológica de granularidade (mais recente -> mais amplo -> custom).
const PERIODO_PRESETS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'campanha', label: 'Desde o início da campanha' },
  { id: 'tudo', label: 'Toda a janela puxada' },
  { id: 'custom', label: 'Período / dia personalizado' },
];

function diaISOComOffset(offsetDias) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function montarFiltroPeriodo(containerId, { campanhaInicio, min, max, onChange, inicial, presets }) {
  const container = document.getElementById(containerId);
  const idsVisiveis = presets && presets.length ? presets : PERIODO_PRESETS.map(p => p.id);
  const lista = PERIODO_PRESETS.filter(p => idsVisiveis.includes(p.id));
  let ativo = inicial || 'campanha';
  if (!idsVisiveis.includes(ativo)) ativo = lista[0].id;

  function limitesPreset(preset) {
    const hoje = diaISOComOffset(0);
    if (preset === 'hoje') return [hoje, hoje];
    if (preset === 'ontem') { const o = diaISOComOffset(-1); return [o, o]; }
    if (preset === '7d') return [diaISOComOffset(-6), hoje];
    if (preset === '30d') return [diaISOComOffset(-29), hoje];
    if (preset === 'campanha') return [campanhaInicio, hoje];
    if (preset === 'tudo') return [min, max];
    return null;
  }

  function disparar(inicio, fim) {
    if (inicio && fim && inicio <= fim) onChange(inicio, fim);
  }

  function render() {
    container.innerHTML = `
      <div class="filtro-periodo">
        ${lista.map(p => `<button data-preset="${p.id}" class="${ativo === p.id ? 'ativo' : ''}">${p.label}</button>`).join('')}
      </div>
      <div class="filtro-custom" style="display:${ativo === 'custom' ? 'flex' : 'none'}">
        <input type="date" id="${containerId}-inicio" min="${min}" max="${max}" />
        <span>até</span>
        <input type="date" id="${containerId}-fim" min="${min}" max="${max}" />
      </div>
    `;
    container.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ativo = btn.dataset.preset;
        render();
        if (ativo === 'custom') {
          const ini = document.getElementById(`${containerId}-inicio`);
          const fim = document.getElementById(`${containerId}-fim`);
          if (!ini.value) ini.value = max;
          if (!fim.value) fim.value = max;
          disparar(ini.value, fim.value);
        } else {
          const [i, f] = limitesPreset(ativo);
          disparar(i, f);
        }
      });
    });
    if (ativo === 'custom') {
      const ini = document.getElementById(`${containerId}-inicio`);
      const fim = document.getElementById(`${containerId}-fim`);
      ini.addEventListener('change', () => disparar(ini.value, fim.value));
      fim.addEventListener('change', () => disparar(ini.value, fim.value));
    }
  }

  render();
  const [i, f] = limitesPreset(ativo) || [max, max];
  disparar(i, f);
}
