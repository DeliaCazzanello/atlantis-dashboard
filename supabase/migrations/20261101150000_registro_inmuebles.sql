-- Registrar, editar y eliminar inmuebles desde el panel del asesor: permisos de escritura y bucket de fotos.
-- Se puede ejecutar más de una vez. Requiere el esquema private de 20261101120000_rls_modulo_clientes.sql.
-- Roles en public.usuario.rol: 1 = cliente, 2 = asesor.

create or replace function private.es_asesor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario where id = (select auth.uid()) and rol = 2
  );
$$;

grant execute on function private.es_asesor() to authenticated;

-- inmueble: el asesor registra inmuebles a su nombre (nunca a nombre de otro asesor).
drop policy if exists "inmueble: el asesor registra los suyos" on public.inmueble;
create policy "inmueble: el asesor registra los suyos"
  on public.inmueble for insert
  to authenticated
  with check (id_asesor = (select auth.uid()) and (select private.es_asesor()));

drop policy if exists "inmueble: el asesor edita los suyos" on public.inmueble;
create policy "inmueble: el asesor edita los suyos"
  on public.inmueble for update
  to authenticated
  using (id_asesor = (select auth.uid()))
  with check (id_asesor = (select auth.uid()));

-- Solo se borran inmuebles sin negociaciones: con ellas quedarían comisiones y movimientos sin inmueble
-- (negociacion.id_inmueble no tiene llave foránea que lo impida).
drop policy if exists "inmueble: el asesor borra los suyos" on public.inmueble;
create policy "inmueble: el asesor borra los suyos"
  on public.inmueble for delete
  to authenticated
  using (
    id_asesor = (select auth.uid())
    and not exists (select 1 from public.negociacion n where n.id_inmueble = inmueble.id)
  );

-- inmueble_modalidad: precios solo para inmuebles propios.
drop policy if exists "modalidad: el asesor pone precio a los suyos" on public.inmueble_modalidad;
create policy "modalidad: el asesor pone precio a los suyos"
  on public.inmueble_modalidad for insert
  to authenticated
  with check (exists (
    select 1 from public.inmueble i
    where i.id = inmueble_modalidad.id_inmueble and i.id_asesor = (select auth.uid())
  ));

drop policy if exists "modalidad: el asesor cambia el precio de los suyos" on public.inmueble_modalidad;
create policy "modalidad: el asesor cambia el precio de los suyos"
  on public.inmueble_modalidad for update
  to authenticated
  using (exists (
    select 1 from public.inmueble i
    where i.id = inmueble_modalidad.id_inmueble and i.id_asesor = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.inmueble i
    where i.id = inmueble_modalidad.id_inmueble and i.id_asesor = (select auth.uid())
  ));

drop policy if exists "modalidad: el asesor quita precios de los suyos" on public.inmueble_modalidad;
create policy "modalidad: el asesor quita precios de los suyos"
  on public.inmueble_modalidad for delete
  to authenticated
  using (exists (
    select 1 from public.inmueble i
    where i.id = inmueble_modalidad.id_inmueble and i.id_asesor = (select auth.uid())
  ));

create index if not exists inmueble_id_asesor_idx on public.inmueble (id_asesor);

-- Fotos: bucket público (el catálogo las muestra a cualquiera); cada asesor sube solo a su carpeta <id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inmuebles', 'inmuebles', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "fotos: el asesor sube a su carpeta" on storage.objects;
create policy "fotos: el asesor sube a su carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'inmuebles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.es_asesor())
  );

drop policy if exists "fotos: el asesor borra de su carpeta" on storage.objects;
create policy "fotos: el asesor borra de su carpeta"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'inmuebles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
