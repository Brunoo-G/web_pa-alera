-- Super Pañalera · completar marcas y una descripción (27/10/2026)
-- Solo toca productos SIN marca: si Mónica ya cargó una, no la pisa.
begin;
update public.productos set marca = 'Alltomom' where id in ('tn-sacaleche-electrico-alltomom-6819') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Cheeky' where id in ('tn-cheeky-cool-boys-cmows') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Comodín' where id in ('tn-comodin-anatomico', 'tn-comodin-anatomico-juvenil', 'tn-comodin-aposito-incontinencia', 'tn-comodin-aposito-refuerza-panal', 'tn-comodin-clasico-adulto', 'tn-comodin-practi-bano', 'tn-comodin-ropa-interior', 'tn-comodin-zaleas-descartables') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Coqueterías' where id in ('tn-4-1u019') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Danielle' where id in ('tn-11-grypo', 'tn-12-1k9gx', 'tn-13-7293x', 'tn-15-nqeg0', 'tn-danielle-boy-1kcyr') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Dove' where id in ('tn-acondicionador-baby-dove', 'tn-jabon-baby-dove', 'tn-jabon-liquido-baby-dove', 'tn-jabon-liquido-repuesto-baby-dove', 'tn-shampoo-baby-dove') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Espadol' where id in ('tn-espadol-dettol-jabon-1ni9i', 'tn-jab-liq-espad-dettol-1dy11', 'tn-toall-desinfectantes-espadol-dettol-1py8h') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Johnson' where id in ('pmuuecutgbdras') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Kevingston' where id in ('tn-perfume-kevingstone-dz0ij') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Loopi' where id in ('tn-sacaleche-manual-loopi') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Mujercitas' where id in ('tn-10-yvqrq', 'tn-5-1ueei', 'tn-8-jg91g', 'tn-9-144tw') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Paco' where id in ('tn-perfume-paco-1ru5q', 'tn-perfume-paco-surf-7vhm8') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Petit Amour' where id in ('tn-2-10elh', 'tn-3-32lzw', 'tn-6-jscqv', 'tn-7-h3v6k') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Petit Enfant' where id in ('tn-16-1vu38', 'tn-17-1b69c', 'tn-18-1l4m9', 'tn-19-26ri5', 'tn-20-6m5bo', 'tn-21-1afik', 'tn-crema-enjuague-petit-enfant', 'tn-espuma-de-bano-petit-enfant', 'tn-shampoo-petit-enfant-boys-girls', 'tn-shampoo-petit-enfant-neutro-de-0-a-1') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Petit Prince' where id in ('tn-petit-prince-18-boys-9eim2', 'tn-petit-prince-cologne-jean-xv1p0') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Pibes' where id in ('tn-colonia-pibes-16snc') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Plenitud' where id in ('tn-plenitud-classic', 'tn-plenitud-classic-ropa-interior', 'tn-plenitud-femme-protector-largo', 'tn-plenitud-femme-ropa-interior', 'tn-plenitud-plus-ropa-interior') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'TENA' where id in ('tn-tena-ropa-interior-pants-clasico') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Upa la la!' where id in ('tn-colonia-upa-la-la-luz-de-luna-pg3dy', 'tn-colonia-upa-la-la-new-baby-l2lvh', 'tn-crema-enjuague-upa-la-la', 'tn-jabon-de-tocador-upa-la-la', 'tn-jabon-liquido-upa-la-la', 'tn-polvo-de-fecula-upa-la-la', 'tn-shampoo-upa-la-la') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Vaita' where id in ('tn-contenedor-de-leche-materna-vaita', 'tn-mi-primer-kit-vaita') and coalesce(trim(marca), '') = '';
update public.productos set marca = 'Vidol' where id in ('tn-repuesto-polvo-de-fecula-vidol') and coalesce(trim(marca), '') = '';
-- La misma marca escrita igual en todos (si no, el filtro muestra dos)
update public.productos set marca = 'Babysec' where marca = 'BABYSEC';
-- Descripción para el único producto que no tenía
update public.productos set descripcion = 'Pañal descartable para adultos Plenitud Classic, con cintas para ajustarlo y protección para la incontinencia. Consultá los talles disponibles por WhatsApp.' where id = 'tn-plenitud-classic' and length(trim(coalesce(descripcion, ''))) < 20;
commit;

-- Control: visibles que siguen sin marca (deberían quedar 15)
select count(*) as sin_marca from public.productos where visible and coalesce(trim(marca), '') = '';
