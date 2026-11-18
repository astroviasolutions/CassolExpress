import { lazy, Suspense, useEffect, useState } from 'react';
import { sair, sessaoAtual, temServidor } from './auth.js';
import Login from './Login.jsx';
import { useStore } from './store.js';
import { logoRedonda, useTema } from './theme.js';
import { Icon } from './ui.jsx';

const Painel = lazy(() => import('./views/Painel.jsx'));
const Romaneio = lazy(() => import('./views/Romaneio.jsx'));
const Entregas = lazy(() => import('./views/Entregas.jsx'));
const Motorista = lazy(() => import('./views/Motorista.jsx'));
const Comissao = lazy(() => import('./views/Comissao.jsx'));
const Caixa = lazy(() => import('./views/Caixa.jsx'));
const Rastreador = lazy(() => import('./views/Rastreador.jsx'));
const Ajustes = lazy(() => import('./views/Ajustes.jsx'));
const Ponto = lazy(() => import('./views/Ponto.jsx'));
const PontoColab = lazy(() => import('./views/PontoColab.jsx'));

const NAV = [
  ['painel', 'Painel', 'Como está a operação hoje', 'home', Painel],
  ['romaneio', 'Romaneio', 'Importe a lista da plataforma e agrupe por cliente', 'upload', Romaneio],
  ['entregas', 'Entregas', 'Todas as paradas e o que já foi baixado', 'box', Entregas],
  ['motorista', 'Motorista', 'Como o motorista vê e dá baixa no celular', 'truck', Motorista],
  ['comissao', 'Comissão', 'Acerto quinzenal com descontos', 'percent', Comissao],
  ['caixa', 'Caixa', 'Entradas, saídas e previsão', 'wallet', Caixa],
  ['ponto', 'Ponto', 'Registro de ponto por localização, folhas e ajustes', 'clock', Ponto],
  ['rastreador', 'Rastreador', 'Veículos e integração com rastreamento', 'pin', Rastreador],
  ['ajustes', 'Ajustes', 'Motoristas, valores e prazos', 'sliders', Ajustes],
];
const K_SESSAO = 'casol_sessao';
const K_ABA = 'casol_aba';

export default function App() {
  const [tema, alternar] = useTema();
  const S = useStore();
  const [sessao, setSessao] = useState(undefined);
  const [aba, setAba] = useState(() => { try { return localStorage.getItem(K_ABA) || 'painel'; } catch { return 'painel'; } });

  useEffect(() => {
    (async () => {
      if (temServidor) return setSessao(await sessaoAtual());
      try { setSessao(JSON.parse(sessionStorage.getItem(K_SESSAO)) || null); } catch { setSessao(null); }
    })();
  }, []);
  useEffect(() => { try { localStorage.setItem(K_ABA, aba); } catch { /* sem storage */ } }, [aba]);

  /* brilho que segue o mouse nos cartões */
  useEffect(() => {
    const f = (e) => {
      const c = e.target.closest?.('.card'); if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', f, { passive: true });
    return () => document.removeEventListener('pointermove', f);
  }, []);

  const entrou = (s) => { if (!temServidor) sessionStorage.setItem(K_SESSAO, JSON.stringify(s)); setSessao(s); };
  const saiu = async () => { await sair(); sessionStorage.removeItem(K_SESSAO); setSessao(null); };

  if (sessao === undefined) return null;
  if (!sessao) return <Login tema={tema} onEntrar={entrou} />;

  const Toggle = (
    <button className="btn icon" onClick={alternar} aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'} title="Tema">
      <Icon n={tema === 'escuro' ? 'sun' : 'moon'} size={20} />
    </button>
  );
  const Status = <span className="pill"><b />{temServidor ? 'Salvo na nuvem' : 'Demonstração · salvo neste navegador'}</span>;
  const Carregando = <div className="empty">Carregando…</div>;

  /* motorista: só a tela do celular */
  if (sessao.papel === 'motorista') {
    return (
      <main className="main" style={{ marginLeft: 0 }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <img src={logoRedonda(tema)} alt="Casol Express" width="52" height="52" style={{ borderRadius: '50%' }} />
          <div className="row">{Toggle}<button className="btn icon" onClick={saiu} aria-label="Sair"><Icon n="logout" size={20} /></button></div>
        </div>
        <Suspense fallback={Carregando}><Motorista modo="motorista" motoristaId={sessao.motoristaId} /></Suspense>
      </main>
    );
  }

  /* colaborador: só a tela de ponto do celular */
  if (sessao.papel === 'colaborador') {
    return (
      <main className="main" style={{ marginLeft: 0 }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <img src={logoRedonda(tema)} alt="Casol Express" width="52" height="52" style={{ borderRadius: '50%' }} />
          <div className="row">{Toggle}<button className="btn icon" onClick={saiu} aria-label="Sair"><Icon n="logout" size={20} /></button></div>
        </div>
        <Suspense fallback={Carregando}><PontoColab /></Suspense>
      </main>
    );
  }

  const [, titulo, sub, , Tela] = NAV.find((n) => n[0] === aba) || NAV[0];
  return (
    <>
      <nav className="rail" aria-label="Menu principal">
        <img className="logo" src={logoRedonda(tema)} alt="Casol Express" />
        {NAV.map(([id, nome, , icone]) => (
          <button key={id} className={aba === id ? 'on' : ''} onClick={() => setAba(id)} title={nome} aria-label={nome} aria-current={aba === id ? 'page' : undefined}>
            <Icon n={icone} />
          </button>
        ))}
        <span className="sp" />
        <button onClick={saiu} title="Sair" aria-label="Sair"><Icon n="logout" /></button>
      </nav>
      <main className="main">
        {S.demo && <div className="demo-strip">DADOS FICTÍCIOS DE DEMONSTRAÇÃO · NADA AQUI É OPERAÇÃO REAL</div>}
        <header className="head">
          <div><h1>{titulo}</h1><p>{sub}</p></div>
          <div className="tools">{Status}{Toggle}</div>
        </header>
        <Suspense fallback={Carregando}><Tela ir={setAba} /></Suspense>
      </main>
    </>
  );
}
