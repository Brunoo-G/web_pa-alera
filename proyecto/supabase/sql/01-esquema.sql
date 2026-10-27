-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · esquema de la base
--  Pegar entero en Supabase → SQL Editor → Run. Es idempotente: se puede
--  volver a correr sin romper nada.
--
--  Idea central: el navegador NUNCA decide un precio. El pedido llega con
--  qué productos y cuántos, y la base calcula el total con sus propios
--  precios. Todo lo demás son permisos.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Quién es administrador ──────────────────────────────────────────
-- Una fila por persona que puede entrar al panel. El alta se hace a mano
-- desde acá; no hay forma de darse de alta solo.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre  text,
  creado  timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

drop policy if exists admins_ven_admins on public.admins;
create policy admins_ven_admins on public.admins
  for select to authenticated using (public.es_admin());

-- ── 2. Productos ───────────────────────────────────────────────────────
create table if not exists public.productos (
  id           text primary key,
  nombre       text not null check (length(nombre) between 1 and 160),
  categoria    text not null default '' check (length(categoria) <= 80),
  subcategoria text not null default '' check (length(subcategoria) <= 80),
  marca        text not null default '' check (length(marca) <= 80),
  precio       numeric(12,2) not null default 0 check (precio >= 0 and precio < 100000000),
  descripcion  text not null default '' check (length(descripcion) <= 4000),
  variedades   jsonb not null default '[]'::jsonb,
  imagenes     jsonb not null default '[]'::jsonb,
  destacado    boolean not null default false,
  oferta       boolean not null default false,
  visible      boolean not null default true,
  orden        bigint  not null default (extract(epoch from now()) * 1000)::bigint,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index if not exists productos_orden_idx  on public.productos (orden);
create index if not exists productos_visible_idx on public.productos (visible) where visible;

alter table public.productos enable row level security;

-- Cualquiera ve lo publicado; solo un admin lo toca.
drop policy if exists productos_lectura_publica on public.productos;
create policy productos_lectura_publica on public.productos
  for select to anon, authenticated using (visible = true or public.es_admin());

drop policy if exists productos_escribe_admin on public.productos;
create policy productos_escribe_admin on public.productos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ── 3. Cupones ─────────────────────────────────────────────────────────
-- Nadie de afuera puede listarlos: se consultan de a uno por código.
create table if not exists public.cupones (
  codigo text primary key check (codigo = upper(codigo) and length(codigo) between 3 and 20),
  pct    integer not null check (pct between 1 and 90),
  activo boolean not null default true,
  creado timestamptz not null default now()
);
alter table public.cupones enable row level security;

drop policy if exists cupones_solo_admin on public.cupones;
create policy cupones_solo_admin on public.cupones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create or replace function public.validar_cupon(p_codigo text)
returns integer language sql stable security definer set search_path = public as $$
  select c.pct from public.cupones c
   where c.codigo = upper(trim(p_codigo)) and c.activo
   limit 1;
$$;
revoke all on function public.validar_cupon(text) from public;
grant execute on function public.validar_cupon(text) to anon, authenticated;

-- ── 4. Pedidos ─────────────────────────────────────────────────────────
-- items llega así: [{"producto_id":"ej1","variedad":"M","cant":2}]
-- Sin precios. Los pone la base.
create table if not exists public.pedidos (
  id        uuid primary key default gen_random_uuid(),
  codigo    text not null unique check (codigo ~ '^[A-Z0-9]{4,8}$'),
  fecha     timestamptz not null default now(),
  estado    text not null default 'pendiente' check (estado in ('pendiente','confirmado')),
  items     jsonb not null check (jsonb_typeof(items) = 'array'
                                  and jsonb_array_length(items) between 1 and 60),
  cupon     text,
  -- calculados por la base, nunca por el navegador
  detalle   jsonb   not null default '[]'::jsonb,
  subtotal  numeric(12,2) not null default 0,
  pct       integer not null default 0,
  descuento numeric(12,2) not null default 0,
  total     numeric(12,2) not null default 0,
  nota      text check (length(nota) <= 500)
);
create index if not exists pedidos_fecha_idx on public.pedidos (fecha desc);

alter table public.pedidos enable row level security;

-- El visitante puede dejar un pedido y nada más: no los lee, no los edita.
drop policy if exists pedidos_crea_cualquiera on public.pedidos;
create policy pedidos_crea_cualquiera on public.pedidos
  for insert to anon, authenticated with check (true);

drop policy if exists pedidos_lee_admin on public.pedidos;
create policy pedidos_lee_admin on public.pedidos
  for select to authenticated using (public.es_admin());

drop policy if exists pedidos_edita_admin on public.pedidos;
create policy pedidos_edita_admin on public.pedidos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists pedidos_borra_admin on public.pedidos;
create policy pedidos_borra_admin on public.pedidos
  for delete to authenticated using (public.es_admin());

-- ── 5. El total lo calcula la base ─────────────────────────────────────
create or replace function public.calcular_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_items    jsonb := '[]'::jsonb;
  v_sub      numeric(12,2) := 0;
  v_pct      integer := 0;
  it         jsonb;
  v_cant     integer;
  v_prod     public.productos%rowtype;
begin
  for it in select * from jsonb_array_elements(new.items) loop
    v_cant := greatest(1, least(99, coalesce((it->>'cant')::integer, 1)));
    select * into v_prod from public.productos
      where id = (it->>'producto_id') and visible = true;
    if not found then
      raise exception 'Producto inexistente o no publicado: %', it->>'producto_id';
    end if;
    v_sub := v_sub + v_prod.precio * v_cant;
    v_items := v_items || jsonb_build_object(
      'producto_id', v_prod.id,
      'nombre',      v_prod.nombre,
      'variedad',    coalesce(it->>'variedad', ''),
      'cant',        v_cant,
      'precio',      v_prod.precio
    );
  end loop;

  if new.cupon is not null and length(trim(new.cupon)) > 0 then
    select c.pct into v_pct from public.cupones c
      where c.codigo = upper(trim(new.cupon)) and c.activo;
    if v_pct is null then
      new.cupon := null; v_pct := 0;      -- cupón vencido o inventado: se ignora
    else
      new.cupon := upper(trim(new.cupon));
    end if;
  else
    new.cupon := null;
  end if;

  new.detalle   := v_items;
  new.subtotal  := v_sub;
  new.pct       := v_pct;
  new.descuento := round(v_sub * v_pct / 100.0, 2);
  new.total     := new.subtotal - new.descuento;
  new.fecha     := now();
  new.estado    := 'pendiente';
  return new;
end;
$$;

drop trigger if exists pedidos_calcular on public.pedidos;
create trigger pedidos_calcular before insert on public.pedidos
  for each row execute function public.calcular_pedido();

-- El admin cambia el estado y nada más: los importes quedan congelados.
create or replace function public.pedido_solo_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.items := old.items; new.detalle := old.detalle; new.cupon := old.cupon;
  new.subtotal := old.subtotal; new.pct := old.pct;
  new.descuento := old.descuento; new.total := old.total;
  new.codigo := old.codigo; new.fecha := old.fecha;
  return new;
end;
$$;
drop trigger if exists pedidos_congelar on public.pedidos;
create trigger pedidos_congelar before update on public.pedidos
  for each row execute function public.pedido_solo_estado();

-- ── 6. Freno contra el spam de pedidos ─────────────────────────────────
-- Nada limitaba cuántos pedidos podía escribir un visitante. Esto corta
-- la inundación sin molestar al tráfico real; el número se sube desde acá.
create or replace function public.freno_pedidos()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ultimos integer;
begin
  select count(*) into v_ultimos from public.pedidos
    where fecha > now() - interval '5 minutes';
  if v_ultimos >= 30 then
    raise exception 'Demasiados pedidos seguidos. Probá de nuevo en unos minutos.';
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_freno on public.pedidos;
create trigger pedidos_freno before insert on public.pedidos
  for each row execute function public.freno_pedidos();

-- ── 7. Configuración de la tienda (íconos por categoría, textos) ───────
create table if not exists public.config (
  clave text primary key,
  valor jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
alter table public.config enable row level security;

drop policy if exists config_lectura_publica on public.config;
create policy config_lectura_publica on public.config
  for select to anon, authenticated using (true);

drop policy if exists config_escribe_admin on public.config;
create policy config_escribe_admin on public.config
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ── 8. Fotos ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 3145728,
        array['image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do update
  set public = true, file_size_limit = 3145728,
      allowed_mime_types = array['image/webp','image/jpeg','image/png','image/avif'];

drop policy if exists fotos_lectura_publica on storage.objects;
create policy fotos_lectura_publica on storage.objects
  for select to anon, authenticated using (bucket_id = 'fotos');

drop policy if exists fotos_escribe_admin on storage.objects;
create policy fotos_escribe_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos' and public.es_admin())
  with check (bucket_id = 'fotos' and public.es_admin());

-- ── 9. Permisos de tabla ───────────────────────────────────────────────
-- Las políticas de arriba deciden QUÉ fila se toca; esto decide qué
-- operación existe siquiera para cada rol. Las dos capas, no una.
revoke all on public.productos, public.pedidos, public.cupones,
                public.config, public.admins from anon, authenticated;
grant select on public.productos, public.config to anon, authenticated;
grant insert on public.pedidos to anon, authenticated;
grant select, insert, update, delete
  on public.productos, public.pedidos, public.cupones, public.config to authenticated;
grant select on public.admins to authenticated;

-- ── 10. Marca de tiempo al editar ──────────────────────────────────────
create or replace function public.tocar()
returns trigger language plpgsql as $$
begin new.actualizado := now(); return new; end;
$$;
drop trigger if exists productos_tocar on public.productos;
create trigger productos_tocar before update on public.productos
  for each row execute function public.tocar();

-- ═══ Después de correr esto ════════════════════════════════════════════
-- 1) Authentication → Users → Add user, con tu email y una contraseña larga.
-- 2) Copiá el UID que queda y corré:
--      insert into public.admins (user_id, nombre)
--      values ('PEGA-ACA-EL-UID', 'Bruno');
-- 3) Authentication → Providers: dejá solo Email y apagá "Enable sign ups"
--    (nadie tiene que poder crearse una cuenta solo).
-- ═══════════════════════════════════════════════════════════════════════
