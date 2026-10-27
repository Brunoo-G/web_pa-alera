-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · condiciones de los cupones
--  Pegar entero en Supabase → SQL Editor → Run. Se puede correr dos veces.
--
--  Un cupón puede:
--    · valer solo para algunas categorías (categorias vacío = todo el carrito)
--    · dejar afuera los productos que ya tienen descuento (solo_sin_dto)
--
--  El % se aplica sobre la suma de los productos que entran. Si ninguno
--  entra, el pedido se guarda sin cupón y no le gasta un uso.
--  Como siempre, la cuenta que vale es la de la base (calcular_pedido).
-- ═══════════════════════════════════════════════════════════════════════

alter table public.cupones
  add column if not exists categorias   text[]  not null default '{}',
  add column if not exists solo_sin_dto boolean not null default false;

do $$
begin
  alter table public.cupones
    add constraint cupones_categorias_ok check (cardinality(categorias) <= 50);
exception when duplicate_object then null;
end $$;

-- ¿Este producto entra en el cupón?
create or replace function public.entra_en_cupon(c public.cupones, p public.productos)
returns boolean language sql immutable set search_path = public as $$
  select (cardinality(c.categorias) = 0
          or lower(btrim(p.categoria)) = any (
               select lower(btrim(x)) from unnest(c.categorias) x))
     and not (c.solo_sin_dto and p.oferta and coalesce(p.descuento, 0) > 0);
$$;

revoke all on function public.entra_en_cupon(public.cupones, public.productos) from public;

-- El que manda: recalcula el pedido entero (precios, oferta, cupón y tope).
create or replace function public.calcular_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_items    jsonb := '[]'::jsonb;
  v_sub      numeric(12,2) := 0;
  v_base     numeric(12,2) := 0;   -- lo que suma lo que entra en el cupón
  v_pct      integer := 0;
  it         jsonb;
  v_cant     integer;
  v_var      text;
  v_precio   numeric(12,2);
  v_lista    numeric(12,2);
  v_prod     public.productos%rowtype;
  v_cup      public.cupones%rowtype;
  v_hay_cup  boolean := false;
  v_usos     integer;
begin
  if new.cupon is not null and length(btrim(new.cupon)) > 0 then
    select * into v_cup from public.cupones
      where codigo = upper(btrim(new.cupon)) and activo;
    v_hay_cup := found;
  end if;

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
    if v_hay_cup and public.entra_en_cupon(v_cup, v_prod) then
      v_base := v_base + v_precio * v_cant;
    end if;
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

  if v_hay_cup and v_base > 0 then
    v_usos := public.usos_cupon(v_cup.codigo);
    if v_cup.tope > 0 and v_usos >= v_cup.tope then
      /* Se acabó el cupo: no se aplica y el cupón queda pausado. */
      update public.cupones set activo = false where codigo = v_cup.codigo;
      new.cupon := null; v_pct := 0; v_base := 0;
    else
      new.cupon := v_cup.codigo;
      v_pct := v_cup.pct;
      /* Si este pedido es el que llena el cupo, se pausa en el acto. */
      if v_cup.tope > 0 and v_usos + 1 >= v_cup.tope then
        update public.cupones set activo = false where codigo = v_cup.codigo;
      end if;
    end if;
  else
    /* cupón inexistente, pausado, o ningún producto entra en él */
    new.cupon := null; v_pct := 0; v_base := 0;
  end if;

  new.detalle   := v_items;
  new.subtotal  := v_sub;
  new.pct       := v_pct;
  new.descuento := round(v_base * v_pct / 100.0, 0);
  new.total     := new.subtotal - new.descuento;
  new.fecha     := now();
  new.estado    := 'pendiente';
  return new;
end;
$$;

-- Para el carrito: el %, las condiciones, o por qué no se puede usar.
--   {"estado":"ok","pct":10,"categorias":[...],"solo_sin_dto":false}
--   · "agotado" · "pausado" · "no"
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
  return jsonb_build_object('estado', 'ok', 'pct', c.pct,
                            'categorias', to_jsonb(c.categorias),
                            'solo_sin_dto', c.solo_sin_dto);
end;
$$;
revoke all on function public.revisar_cupon(text) from public;
grant execute on function public.revisar_cupon(text) to anon, authenticated;
