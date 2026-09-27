-- =====================================================================
--  CENTRAL DE VENDAS — estrutura do banco (Supabase)
--  Cole TUDO isto no SQL Editor do Supabase e clique em "Run".
--  Pode rodar de novo sem problema: nada é apagado.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- CATEGORIAS ----------
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  ordem      int  not null default 0,
  criado_em  timestamptz not null default now()
);

-- ---------- PRODUTOS (o que o público pode ver) ----------
create table if not exists public.produtos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text not null default '',
  categoria_id  uuid references public.categorias(id) on delete set null,
  condicao      text not null default 'Usado',
  preco         numeric(10,2),
  status        text not null default 'rascunho'
                check (status in ('rascunho','disponivel','reservado','vendido')),
  destaque      boolean not null default false,
  fotos         text[]  not null default '{}',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists produtos_status_idx    on public.produtos(status);
create index if not exists produtos_categoria_idx on public.produtos(categoria_id);

-- ---------- DADOS PRIVADOS (custo, venda, anotações) — só você vê ----------
create table if not exists public.produtos_privado (
  produto_id   uuid primary key references public.produtos(id) on delete cascade,
  custo        numeric(10,2),
  preco_venda  numeric(10,2),
  vendido_em   date,
  onde_comprou text,
  observacoes  text
);

-- atualiza "atualizado_em" automaticamente
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists produtos_atualizado on public.produtos;
create trigger produtos_atualizado
  before update on public.produtos
  for each row execute function public.tocar_atualizado_em();

-- =====================================================================
--  SEGURANÇA (Row Level Security)
--  - Visitante: vê categorias e produtos "disponível" ou "reservado".
--  - Você logado: faz tudo.
--  - Custo/anotações: visitante NUNCA consegue ler.
-- =====================================================================
alter table public.categorias       enable row level security;
alter table public.produtos         enable row level security;
alter table public.produtos_privado enable row level security;

grant select on public.categorias, public.produtos to anon;
grant select, insert, update, delete
  on public.categorias, public.produtos, public.produtos_privado to authenticated;
revoke all on public.produtos_privado from anon;

drop policy if exists categorias_leitura_publica on public.categorias;
create policy categorias_leitura_publica on public.categorias
  for select to anon, authenticated using (true);

drop policy if exists categorias_admin on public.categorias;
create policy categorias_admin on public.categorias
  for all to authenticated using (true) with check (true);

drop policy if exists produtos_leitura_publica on public.produtos;
create policy produtos_leitura_publica on public.produtos
  for select to anon using (status in ('disponivel','reservado'));

drop policy if exists produtos_admin on public.produtos;
create policy produtos_admin on public.produtos
  for all to authenticated using (true) with check (true);

drop policy if exists privado_admin on public.produtos_privado;
create policy privado_admin on public.produtos_privado
  for all to authenticated using (true) with check (true);

-- =====================================================================
--  FOTOS (Storage) — pasta pública "fotos", só você envia/apaga
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists fotos_admin_select on storage.objects;
create policy fotos_admin_select on storage.objects
  for select to authenticated using (bucket_id = 'fotos');

drop policy if exists fotos_admin_insert on storage.objects;
create policy fotos_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists fotos_admin_update on storage.objects;
create policy fotos_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'fotos');

drop policy if exists fotos_admin_delete on storage.objects;
create policy fotos_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

-- =====================================================================
--  CATEGORIAS INICIAIS (edite depois pelo painel)
-- =====================================================================
insert into public.categorias (nome, ordem) values
  ('Processadores', 1),
  ('Placas de vídeo', 2),
  ('Memórias', 3),
  ('Teclados', 4),
  ('Videogames', 5),
  ('Outros', 99)
on conflict (nome) do nothing;
