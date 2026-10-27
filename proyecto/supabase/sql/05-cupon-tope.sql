-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · tope de usos por cupón
--
--  El admin puede decir "este cupón vale para las primeras 20 compras".
--  Al llegar al tope el cupón se pausa solo y deja de aplicar.
--
--  Qué cuenta como un uso: cada pedido que tenga ese cupón, esté pendiente
--  o confirmado. Si el admin borra un pedido, ese uso se libera. Contar
--  solo los confirmados dejaría la puerta abierta a que veinte personas
--  armen el pedido con el mismo cupón antes de que se confirme ninguno.
--
--  La cuenta la hace la base, no el navegador: validar_cupon es solo para
--  avisarle al cliente, y calcular_pedido es el que manda.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.cupones
  add column if not exists tope integer not null default 0;

do $$
begin
  alter table public.cupones
    add constraint cupones_tope_ok check (tope >= 0 and tope <= 100000);
exception when duplicate_object then null;
end $$;

create index if not exists pedidos_cupon_idx on public.pedidos (cupon) where cupon is not null;

-- Cuántas veces se usó un cupón.
create or replace function public.usos_cupon(p_codigo text)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.pedidos
   where cupon = upper(trim(p_codigo));
$$;
revoke all on function public.usos_cupon(text) from public;
grant execute on function public.usos_cupon(text) to authenticated;

-- Para el cliente: devuelve el % solo si el cupón está activo y le queda cupo.
create or replace function public.validar_cupon(p_codigo text)
returns integer language sql stable security definer set search_path = public as $$
  select c.pct from public.cupones c
   where c.codigo = upper(trim(p_codigo))
     and c.activo
     and (c.tope = 0 or public.usos_cupon(c.codigo) < c.tope)
   limit 1;
$$;
revoke all on function public.validar_cupon(text) from public;
grant execute on function public.validar_cupon(text) to anon, authenticated;

-- El que manda: recalcula el pedido entero y, de paso, hace valer el tope.
create or replace function public.calcular_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_items    jsonb := '[]'::jsonb;
  v_sub      numeric(12,2) := 0;
  v_pct      integer := 0;
  it         jsonb;
  v_cant     integer;
  v_var      text;
  v_precio   numeric(12,2);
  v_lista    numeric(12,2);
  v_prod     public.productos%rowtype;
  v_cup      public.cupones%rowtype;
  v_usos     integer;
begin
  for it in select * from jsonb_array_elements(new.items) loop
    v_cant := greatest(1, least(99, coalesce((it->>'cant')::integer, 1)));
    v_var  := btrim(coalesce(it->>'variedad', ''));

    select * into v_prod from public.productos
      where id = (it->>'producto_id') and visible = true;
    if not found then
      raise exception 'Producto inexistente o no publicado: %', it->>'producto_id';
    end if;

    /* Precio de la variedad si tiene uno propio; si no, el del producto. */
    select coalesce(
      (select (e->>'p')::numeric
         from jsonb_array_elements(v_prod.variedades) e
        where jsonb_typeof(e) = 'object'
          and lower(btrim(coalesce(e->>'n', ''))) = lower(v_var)
          and coalesce(e->>'p', '') ~ '^[0-9]+(\.[0-9]+)?$'
          and (e->>'p')::numeric > 0
        limit 1),
      v_prod.precio) into v_lista;

    /* Y recién ahí, la rebaja. */
    v_precio := v_lista;
    if v_prod.oferta and coalesce(v_prod.descuento, 0) > 0 then
      v_precio := round(v_lista * (100 - v_prod.descuento) / 100.0, 0);
    end if;

    v_sub := v_sub + v_precio * v_cant;
    v_items := v_items || jsonb_build_object(
      'producto_id', v_prod.id,
      'nombre',      v_prod.nombre,
      'variedad',    v_var,
      'cant',        v_cant,
      'precio',      v_precio,
      'lista',       v_lista,
      'descuento',   case when v_prod.oferta then coalesce(v_prod.descuento, 0) else 0 end
    );
  end loop;

  if new.cupon is not null and length(btrim(new.cupon)) > 0 then
    select * into v_cup from public.cupones
      where codigo = upper(btrim(new.cupon)) and activo;

    if not found then
      new.cupon := null; v_pct := 0;
    else
      v_usos := public.usos_cupon(v_cup.codigo);
      if v_cup.tope > 0 and v_usos >= v_cup.tope then
        /* Se acabó el cupo: no se aplica y el cupón queda pausado. */
        update public.cupones set activo = false where codigo = v_cup.codigo;
        new.cupon := null; v_pct := 0;
      else
        new.cupon := v_cup.codigo;
        v_pct := v_cup.pct;
        /* Si este pedido es el que llena el cupo, se pausa en el acto. */
        if v_cup.tope > 0 and v_usos + 1 >= v_cup.tope then
          update public.cupones set activo = false where codigo = v_cup.codigo;
        end if;
      end if;
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

-- Para el carrito: además del %, dice POR QUÉ no se puede usar, así el
-- cliente ve un mensaje que explica algo en lugar de uno genérico.
--   {"estado":"ok","pct":10} · "agotado" · "pausado" · "no"
-- "agotado" se revisa antes que "pausado" porque un cupón que llegó al tope
-- queda pausado solo: el motivo real es que se agotó.
create or replace function public.revisar_cupon(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.cupones%rowtype;
begin
  select * into c from public.cupones where codigo = upper(trim(p_codigo));
  if not found then
    return jsonb_build_object('estado', 'no');
  end if;
  if c.tope > 0 and public.usos_cupon(c.codigo) >= c.tope then
    return jsonb_build_object('estado', 'agotado');
  end if;
  if not c.activo then
    return jsonb_build_object('estado', 'pausado');
  end if;
  return jsonb_build_object('estado', 'ok', 'pct', c.pct);
end;
$$;
revoke all on function public.revisar_cupon(text) from public;
grant execute on function public.revisar_cupon(text) to anon, authenticated;
