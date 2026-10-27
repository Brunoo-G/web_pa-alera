-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · precios por variedad
--
--  Una variedad pasa a ser un objeto: {"n": "M", "p": 12000}
--  Si "p" es 0 o no está, esa variedad se cobra al precio del producto.
--  Las variedades viejas, que eran solo texto, siguen funcionando.
--
--  Lo importante: el precio de la variedad lo resuelve la base, igual que
--  el del producto. El navegador sigue sin decidir cuánto sale nada.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Pasar las variedades viejas (texto) al formato nuevo ────────────
update public.productos
   set variedades = (
     select coalesce(jsonb_agg(
       case when jsonb_typeof(e) = 'object' then e
            else jsonb_build_object('n', trim(both '"' from e::text), 'p', 0)
       end), '[]'::jsonb)
     from jsonb_array_elements(variedades) e)
 where jsonb_array_length(variedades) > 0
   and exists (select 1 from jsonb_array_elements(variedades) e
                where jsonb_typeof(e) <> 'object');

-- ── 2. El total ahora mira el precio de la variedad ────────────────────
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

    /* Precio de la variedad si tiene uno propio; si no, el del producto.
       El texto se valida con una expresión regular antes de convertirlo,
       así un valor raro guardado en variedades no rompe el pedido. */
    select coalesce(
      (select (e->>'p')::numeric
         from jsonb_array_elements(v_prod.variedades) e
        where jsonb_typeof(e) = 'object'
          and lower(btrim(coalesce(e->>'n', ''))) = lower(v_var)
          and coalesce(e->>'p', '') ~ '^[0-9]+(\.[0-9]+)?$'
          and (e->>'p')::numeric > 0
        limit 1),
      v_prod.precio) into v_precio;

    v_sub := v_sub + v_precio * v_cant;
    v_items := v_items || jsonb_build_object(
      'producto_id', v_prod.id,
      'nombre',      v_prod.nombre,
      'variedad',    v_var,
      'cant',        v_cant,
      'precio',      v_precio
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
