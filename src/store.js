import { useSyncExternalStore } from 'react';
import { uid } from './lib.js';

/*
  Camada de dados. Hoje: localStorage (modo demonstração).
  Quando o Supabase estiver criado, é aqui que o driver de nuvem entra:
  as telas só usam useStore() e act.*, então nada mais precisa mudar.
*/
const KEY = 'casol_express_v1';

export const vazio = () => ({
  v: 1, demo: false,
  empresas: [], motoristas: [], romaneios: [], paradas: [], lancamentos: [], acertos: [], veiculos: [],
  colaboradores: [], pontos: [], pedidosPonto: [],
  ajustes: { saldoInicial: 0, valorPadrao: 0, meta: 0, categorias: [] },
});

function carregar() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); return { ...vazio(), ...s, ajustes: { ...vazio().ajustes, ...s.ajustes } }; }
  } catch { /* dados corrompidos: começa vazio */ }
  return vazio();
}

let state = carregar();
const subs = new Set();

export const getState = () => state;
export function setState(fn) {
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Não foi possível salvar no navegador', e); }
  subs.forEach((f) => f());
}
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);

export const act = {
  limpar: () => setState(() => vazio()),
  async carregarDemo() { const { gerarDemo } = await import('./seed.js'); setState(() => gerarDemo()); },
  add: (col, item) => { const id = uid(); setState((s) => ({ ...s, [col]: [...s[col], { id, ...item }] })); return id; },
  upd: (col, id, patch) => setState((s) => ({ ...s, [col]: s[col].map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  del: (col, id) => setState((s) => ({ ...s, [col]: s[col].filter((x) => x.id !== id) })),
  ajustes: (patch) => setState((s) => ({ ...s, ajustes: { ...s.ajustes, ...patch } })),

  baixar: (id, status, gps) => act.upd('paradas', id, { status, baixaEm: new Date().toISOString(), gps: gps || null }),
  desfazer: (id) => act.upd('paradas', id, { status: 'pendente', baixaEm: null, gps: null }),

  importar: ({ empresaId, data, arquivo, paradas }) => setState((s) => {
    const id = uid();
    const novas = paradas.map((p) => ({ id: uid(), romaneioId: id, status: 'pendente', baixaEm: null, ...p }));
    return { ...s, romaneios: [...s.romaneios, { id, empresaId, data, arquivo, finalizado: false }], paradas: [...s.paradas, ...novas] };
  }),
  excluirRomaneio: (id) => setState((s) => ({ ...s, romaneios: s.romaneios.filter((r) => r.id !== id), paradas: s.paradas.filter((p) => p.romaneioId !== id) })),
  distribuir: (cidade, motoristaId) => setState((s) => ({
    ...s, paradas: s.paradas.map((p) => (!p.motoristaId && (p.cidade || 'Sem cidade') === cidade && p.status === 'pendente' ? { ...p, motoristaId } : p)),
  })),

  /* acerto quinzenal: cria o registro na primeira alteração */
  acertoGarantir: (motoristaId, q) => {
    const s = getState();
    const ex = s.acertos.find((a) => a.motoristaId === motoristaId && a.ini === q.ini);
    if (ex) return ex.id;
    return act.add('acertos', { motoristaId, ini: q.ini, fim: q.fim, descontos: [], aprovadoEm: null, lancId: null });
  },
  descontoAdd: (motoristaId, q, desc, valor) => {
    const id = act.acertoGarantir(motoristaId, q);
    setState((s) => ({ ...s, acertos: s.acertos.map((a) => (a.id === id ? { ...a, descontos: [...a.descontos, { id: uid(), desc, valor }] } : a)) }));
  },
  descontoDel: (acertoId, dId) => setState((s) => ({ ...s, acertos: s.acertos.map((a) => (a.id === acertoId ? { ...a, descontos: a.descontos.filter((d) => d.id !== dId) } : a)) })),
  aprovar: (motoristaId, q, liquido, nome, hojeISO) => {
    const id = act.acertoGarantir(motoristaId, q);
    const lancId = act.add('lancamentos', {
      data: hojeISO, tipo: 'saida', categoria: 'Comissão de motorista', pago: true, venc: hojeISO, origem: 'comissao',
      descricao: `Acerto ${nome} · ${q.ini.slice(8)}/${q.ini.slice(5, 7)} a ${q.fim.slice(8)}/${q.fim.slice(5, 7)}`, valor: liquido,
    });
    act.upd('acertos', id, { aprovadoEm: new Date().toISOString(), lancId });
  },
  desaprovar: (acertoId) => {
    const a = getState().acertos.find((x) => x.id === acertoId);
    if (a?.lancId) act.del('lancamentos', a.lancId);
    act.upd('acertos', acertoId, { aprovadoEm: null, lancId: null });
  },
};
