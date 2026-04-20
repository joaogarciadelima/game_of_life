# Supabase Setup — Jogo da Vida

Guia rápido para habilitar **auth + multiplayer online**. Sem isso, o jogo funciona apenas em modo local/convidado.

## 1. Criar o projeto

1. Acesse https://supabase.com → **New project**
2. Anote:
   - `Project URL` (ex: `https://abcxyz.supabase.co`)
   - `anon public key` (em Settings → API)

## 2. Configurar `.env.local`

```bash
cd app
cp .env.example .env.local
```

Preencha `.env.local`:

```
VITE_SUPABASE_URL=https://abcxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Reinicie o dev server: `npm run dev`.

## 3. Habilitar provedores de auth

**Supabase Studio → Authentication → Providers**:
- ✅ **Email** (ativado por padrão)
- ✅ **Google**: seguir o guia oficial para criar OAuth client no Google Cloud Console; cole `Client ID` + `Client Secret`
- Configure `Site URL` e `Redirect URLs` em Authentication → URL Configuration (ex: `http://localhost:5180` para dev)

## 4. Executar o schema SQL

Supabase Studio → **SQL Editor** → cole e execute:

```sql
-- ========= PROFILES =========
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_read_all" on profiles
  for select using (true);

create policy "profiles_upsert_self" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on profiles
  for update using (auth.uid() = id);

-- Cria perfil automaticamente ao cadastrar
-- IMPORTANTE: usa `set search_path = public` (security definer roda como
-- postgres e sem isso não acha `public.profiles` em produção), e envolve
-- em EXCEPTION para não quebrar o signup caso algo falhe no insert do
-- profile — é o que gera o erro "Database error saving new user".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Jogador'
    )
  );
  return new;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========= ROOMS =========
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'waiting', -- waiting | playing | finished
  max_players int not null default 6,
  created_at timestamptz default now()
);

alter table rooms enable row level security;

create policy "rooms_read_all" on rooms for select using (true);
create policy "rooms_insert_auth" on rooms
  for insert with check (auth.uid() = host_id);
create policy "rooms_update_host" on rooms
  for update using (auth.uid() = host_id);
create policy "rooms_delete_host" on rooms
  for delete using (auth.uid() = host_id);

-- ========= ROOM_PLAYERS =========
create table if not exists room_players (
  room_id uuid not null references rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  display_name text not null,
  color text not null,
  gender text not null default 'blue', -- 'blue' | 'pink'
  seat_index int not null,
  is_host boolean not null default false,
  ready boolean not null default false,
  joined_at timestamptz default now(),
  primary key (room_id, profile_id)
);

alter table room_players enable row level security;

create policy "rp_read_all" on room_players for select using (true);
create policy "rp_insert_self" on room_players
  for insert with check (auth.uid() = profile_id);
create policy "rp_update_self" on room_players
  for update using (auth.uid() = profile_id);
create policy "rp_delete_self" on room_players
  for delete using (auth.uid() = profile_id);

-- ========= GAME_EVENTS =========
-- Cada ação do jogo (rolar roleta, resolver evento, etc) é persistida
-- para que todos os clientes da sala sincronizem via Realtime.
create table if not exists game_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  seq bigserial,
  actor_id uuid references profiles(id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index on game_events (room_id, seq);

alter table game_events enable row level security;

create policy "events_read_all" on game_events for select using (true);
create policy "events_insert_auth" on game_events
  for insert with check (auth.uid() is not null);

-- ========= REALTIME =========
-- Habilita publicações para sincronização em tempo real
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table game_events;
```

## 4.1. Produção (Vercel / domínio público)

Repita o passo **4** no projeto Supabase de produção e ajuste as URLs:

**Authentication → URL Configuration**:
- `Site URL` = URL do deploy (ex: `https://jogo-da-vida.vercel.app`)
- `Redirect URLs` = inclua a mesma URL e quaisquer domínios customizados

**Variáveis de ambiente no Vercel** (Project Settings → Environment Variables):
- `VITE_SUPABASE_URL` = URL do projeto de produção
- `VITE_SUPABASE_ANON_KEY` = anon key de produção

Depois de alterar variáveis, dispare um **redeploy** (as `VITE_*` são embutidas no bundle em build time).

### Troubleshooting: "Database error saving new user"

Erro gerado pelo trigger `handle_new_user`. As causas usuais são:

1. **`search_path` vazio** em função `security definer` → não encontra `public.profiles`. **Fix**: reexecute o bloco do passo 4 (a versão aqui já inclui `set search_path = public`).
2. **`display_name` NULL** (violação de NOT NULL) quando o signup não tem email nem metadata. **Fix**: o `coalesce` na função agora cai em `'Jogador'` como último recurso.
3. **Tabela `profiles` não existe** no banco de produção (schema foi executado só em dev). **Fix**: rode o SQL completo do passo 4 no projeto de produção.

Diagnóstico:

```sql
-- profiles existe?
select column_name, is_nullable from information_schema.columns
where table_schema='public' and table_name='profiles';

-- função atual
select prosrc from pg_proc where proname = 'handle_new_user';
```

## 5. Testar

1. Recarregue o app → tela de login deve mostrar Google + Email + Convidado
2. Crie conta com email → deve receber email de confirmação
3. Crie uma sala → receberá um código de 4 letras
4. Em outra aba/dispositivo, entre com o código

## Decisões de arquitetura

- **Client-side game logic** inicial + **server-side validation** planejada em Edge Functions (futura iteração)
- **Event sourcing**: cada ação vira um `game_events` → reprodutível, audit trail
- **Seats** fixos por sala (até 6) evitam corrida de join
- **Convidados** (sem login) só jogam local — sem persistência online

## Próximos passos (roadmap)

- [ ] Edge Function `validate_action` que checa se o jogador tem a vez e se o movimento é válido antes de persistir o evento
- [ ] Presence API do Supabase para mostrar quem está online
- [ ] Reconnect gracioso (retomar estado do último evento)
- [ ] Leaderboard com histórico de vitórias por perfil
