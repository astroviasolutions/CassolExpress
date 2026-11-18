# Casol Express · Gestão

Sistema de gestão da operação: **Painel, Romaneio, Entregas, Motorista (celular), Comissão, Caixa, Rastreador e Ajustes**.
Marca: logo preta no tema escuro (destaque vermelho) e logo branca no tema claro (destaque dourado).

React + Vite. Estilo em CSS próprio com variáveis de tema (sem Tailwind, para não depender de configuração extra).

## Rodar agora (modo demonstração)

```bash
npm install
npm run dev
```

Sem Supabase, o sistema roda em **modo demonstração**: sem senha, dados só neste navegador. Na tela de login:
- **Entrar com dados fictícios**: carrega uma operação inventada para mostrar o sistema funcionando (tudo fica marcado como fictício).
- **Entrar com o sistema vazio**: começa do zero.
- **Ver como motorista**: abre a visão do celular.

Nenhum dado real de cliente ou operação existe no projeto.

## Próximo passo: criar o Supabase da Casol

1. Crie um projeto **novo e exclusivo da Casol** em supabase.com (nunca reaproveite o banco de outro cliente).
2. **SQL Editor** → cole e rode `supabase/schema.sql` inteiro. Ele cria as tabelas, liga o **RLS em todas** e cria as funções do motorista.
3. **Authentication → Providers → Email**: desative "Allow new users to sign up" (só o dono cria usuários).
4. **Authentication → Users → Add user**: crie o usuário do dono (e-mail e senha). Depois, no SQL Editor:
   ```sql
   update public.perfis set papel = 'dono' where id = (select id from auth.users where email = 'EMAIL_DO_DONO');
   ```
5. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). Use **só a chave publicável**; a `service_role` nunca vai para o front.
6. Reinicie (`npm run dev`). A tela de login passa a pedir e-mail e senha de verdade.

### O que ainda falta ligar quando o Supabase existir
O **login** já usa o Supabase Auth quando as variáveis existem. Os **dados** ainda ficam no navegador: toda a leitura e escrita passa por `src/store.js`, então a troca para o Supabase é feita ali, sem mexer nas telas. É a próxima etapa, junto com o teste das políticas de RLS (dono vê tudo; motorista só as próprias paradas, pelas funções `motorista_*`).

## Publicar

**Atenção:** o modo demonstração não tem senha. Por isso o build de produção **não abre** sem as variáveis `VITE_SUPABASE_*` (mostra "Sistema não configurado").

Hospedagem prevista: **Cloudflare** (build `npm run build`, pasta `dist`). Em variáveis de ambiente de *build* cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Os cabeçalhos de segurança e o redirecionamento das rotas já estão em `public/_headers` e `public/_redirects`.

Antes de publicar, siga o checklist de **SEGURANCA.md** (Supabase: desativar cadastro público, senha forte, MFA do dono, backup) e teste o RLS. Ordem do SQL: `schema.sql`, `ponto.sql`, `sla.sql`.

## O que fica de fora por enquanto
- "Reanalisar com planilha nova" no Romaneio (importar atualização sobre um romaneio existente).
- Integração com provedor de rastreamento (o módulo Rastreador cadastra veículos e usa o GPS do celular como apoio).
- Regras de comissão além de: por pacote (valor por motorista ou padrão) e fixo mensal (a quinzena paga metade). Descontos são lançados à mão na tela Comissão.

## Estrutura

```
src/
  main.jsx · App.jsx · Login.jsx     casca, rotas por aba, login com cena animada
  lib.js                             datas, dinheiro, períodos e TODAS as regras de cálculo
  store.js                           dados (hoje localStorage; amanhã Supabase) e ações
  auth.js                            Supabase Auth (ou modo demonstração)
  seed.js                            dados FICTÍCIOS de demonstração
  views/                             uma tela por módulo
supabase/schema.sql                  banco com RLS
public/                              logos (escura, clara e clara redonda) e favicon
```
