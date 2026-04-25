# ⚽ FutBrasil — Blog de Jogos de Futebol Brasileiro

> Acompanhe em tempo real os jogos dos times brasileiros — Série A, Série B e Copa do Brasil.

---

## 🗂️ Estrutura do Projeto

```
blogg_de_fut_superbase/
├── index.html              # Página principal
├── css/
│   ├── reset.css           # CSS reset
│   ├── tokens.css          # Design tokens (cores, espaçamento, fontes)
│   ├── layout.css          # Header, hero, grid, footer
│   ├── components.css      # Game card (LIVE / SCHEDULED / FINISHED)
│   └── animations.css      # Keyframes e micro-animações
├── js/
│   ├── config.js           # Configurações centrais + dados demo
│   ├── supabase.js         # Cliente Supabase (credenciais via localStorage)
│   ├── api.js              # Camada de dados: Supabase → API-Football → Demo
│   ├── cards.js            # Factory de cards HTML
│   ├── realtime.js         # Supabase Realtime subscription
│   └── app.js              # Controller principal (tabs, filtros, bootstrap)
└── supabase/
    └── schema.sql          # Schema PostgreSQL completo para o Supabase
```

---

## 🚀 Setup Rápido

### 1. Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/schema.sql`
3. Clique em **Run**
4. Em **Database → Replication**, ative a tabela `matches` para o Realtime
5. Copie sua **Project URL** e **anon public key** em **Settings → API**

### 2. Abrir o Blog

- Abra `index.html` diretamente no navegador **ou**
- Use um servidor local: `npx serve .`
- Na modal de configuração, cole a **URL** e a **Anon Key** do Supabase
- Clique em **Conectar ao Supabase**

### 3. API-Football (Opcional — dados reais)

1. Cadastre-se em [api-football.com](https://www.api-football.com) (plano gratuito: 100 req/dia)
2. Copie sua API Key
3. Em `js/config.js`, defina: `API_FOOTBALL_KEY: 'SUA_KEY_AQUI'`

---

## 🏆 Ligas Cobertas

| Liga | ID | Símbolo |
|------|----|---------|
| Campeonato Brasileiro Série A | 71 | 🟢 |
| Campeonato Brasileiro Série B | 72 | 🔵 |
| Copa do Brasil | 73 | 🟡 |
| Copa Sul-Americana | 75 | 🟠 |
| Copa Libertadores | 13 | 🟣 |

---

## ⚡ Funcionalidades

- ✅ **Jogos de Hoje e Amanhã** em abas separadas
- ✅ **Status em tempo real**: AO VIVO (com placar + minuto), Agendado, Encerrado
- ✅ **Escudos dos times** carregados da API
- ✅ **Filtro por liga** (chips clicáveis)
- ✅ **Supabase Realtime** — placar atualiza sem F5
- ✅ **Modo Demo** — funciona sem credenciais com dados de exemplo
- ✅ **Design dark premium** com gradientes e animações
- ✅ **Responsivo** para mobile

---

## 🛡️ Segurança

- RLS habilitado em todas as tabelas
- Anon key do Supabase tem apenas permissão de leitura (SELECT)
- Escritas requerem `service_role` key (nunca exposta no frontend)

---

## 🔮 Próximos Passos

- [ ] Worker/Edge Function no Supabase para sincronizar a API-Football automaticamente (a cada 30s durante jogos ao vivo)
- [ ] Aba "Destaques Internacionais" com Champions League, Premier League
- [ ] Histórico de partidas por time
- [ ] Notificações push para gols
