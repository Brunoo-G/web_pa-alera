-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · estados del pedido (compra v2)
--  Pendiente → Pagado → Enviado (o Listo para retirar) → Entregado.
--  "confirmado" sigue valiendo: es el que usa la tienda publicada hoy, y la
--  versión nueva lo muestra como "Pagado". Se puede correr dos veces.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'confirmado', 'pagado', 'enviado', 'listo', 'entregado'));
