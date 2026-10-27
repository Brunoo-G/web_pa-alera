-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · marca "más vendido"
--
--  Es solo una etiqueta para la vidriera: el admin la prende y en la foto
--  aparece el cartel naranja "Más vendidos". No toca precios ni el orden
--  del catálogo, así que no hace falta cambiar calcular_pedido.
--
--  "destacado" sigue siendo lo que era (aparece entre los primeros), pero
--  ahora se muestra con un fueguito arriba a la derecha de la foto.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.productos
  add column if not exists masvendido boolean not null default false;

create index if not exists productos_masvendido_idx
  on public.productos (masvendido) where masvendido;
