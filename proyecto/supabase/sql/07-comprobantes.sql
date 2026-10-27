-- ═══════════════════════════════════════════════════════════════════════
--  Super Pañalera · comprobantes de transferencia (para la compra v2)
--  Correr en Supabase → SQL Editor recién cuando se publique la compra v2.
--  Bucket PRIVADO: cualquiera puede subir su comprobante, nadie de afuera
--  puede listarlos ni verlos; solo el admin.
-- ═══════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 6291456,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 6291456,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists comprobantes_sube_cualquiera on storage.objects;
create policy comprobantes_sube_cualquiera on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'comprobantes');

drop policy if exists comprobantes_ve_admin on storage.objects;
create policy comprobantes_ve_admin on storage.objects
  for select to authenticated using (bucket_id = 'comprobantes' and public.es_admin());

drop policy if exists comprobantes_borra_admin on storage.objects;
create policy comprobantes_borra_admin on storage.objects
  for delete to authenticated using (bucket_id = 'comprobantes' and public.es_admin());
