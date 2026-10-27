-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · datos del comprador en los pedidos (compra v2)
--  Se puede correr dos veces. No cambia nada de lo que ya funciona: son
--  columnas nuevas y opcionales.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.pedidos
  add column if not exists cliente     jsonb,
  add column if not exists entrega     jsonb,
  add column if not exists pago        text,
  add column if not exists comprobante text,
  add column if not exists prueba      boolean not null default false;

do $$ begin
  alter table public.pedidos add constraint pedidos_cliente_ok
    check (cliente is null or (jsonb_typeof(cliente) = 'object' and length(cliente::text) <= 1000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pedidos add constraint pedidos_entrega_ok
    check (entrega is null or (jsonb_typeof(entrega) = 'object' and length(entrega::text) <= 2000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pedidos add constraint pedidos_pago_ok
    check (pago is null or pago in ('transferencia', 'efectivo'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pedidos add constraint pedidos_comprobante_ok
    check (comprobante is null or comprobante ~ '^[A-Za-z0-9._-]{1,80}$');
exception when duplicate_object then null; end $$;

-- Al editar un pedido (el admin solo cambia el estado) los datos del
-- comprador quedan como llegaron.
create or replace function public.pedido_solo_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.items := old.items; new.detalle := old.detalle; new.cupon := old.cupon;
  new.subtotal := old.subtotal; new.pct := old.pct;
  new.descuento := old.descuento; new.total := old.total;
  new.codigo := old.codigo; new.fecha := old.fecha;
  new.cliente := old.cliente; new.entrega := old.entrega; new.pago := old.pago;
  new.comprobante := old.comprobante; new.prueba := old.prueba;
  return new;
end;
$$;
