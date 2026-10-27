-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · descuento por oferta
--
--  El admin marca un producto en oferta y le pone un porcentaje. El cliente
--  ve el precio anterior tachado, el nuevo, y un cartelito con el % OFF.
--
--  El descuento se aplica también acá, al guardar el pedido: si solo se
--  aplicara en la página, alcanzaría con editar el navegador para pedir
--  el precio sin rebaja (o con una rebaja inventada).
-- ═══════════════════════════════════════════════════════════════════════

alter table public.productos
  add column if not exists descuento integer not null default 0;

do $$
begin
  alter table public.productos
    add constraint productos_descuento_ok check (descuento between 0 and 90);
exception when duplicate_object then null;
end $$;

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
    select c.pct into v_pct from public.cupones c
      where c.codigo = upper(btrim(new.cupon)) and c.activo;
    if v_pct is null then
      new.cupon := null; v_pct := 0;
    else
      new.cupon := upper(btrim(new.cupon));
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
