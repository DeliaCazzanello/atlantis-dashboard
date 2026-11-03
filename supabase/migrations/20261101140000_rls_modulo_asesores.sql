-- RLS de lectura para el panel del asesor (atlantis-dashboard).
-- Complementa 20261101120000_rls_modulo_clientes.sql, que deja las tablas financieras sin políticas.
-- Se puede ejecutar más de una vez. Solo agrega SELECT: el asesor no crea ni edita nada financiero desde la app.

-- participacion_asesor: cada asesor ve sus propias participaciones (su porcentaje y su comisión).
drop policy if exists "participacion: el asesor ve las suyas" on public.participacion_asesor;
create policy "participacion: el asesor ve las suyas"
  on public.participacion_asesor for select
  to authenticated
  using (id_asesor = (select auth.uid()));

-- negociacion: el asesor ve las negociaciones donde participa o que son de inmuebles que captó.
drop policy if exists "negociacion: el asesor ve las suyas" on public.negociacion;
create policy "negociacion: el asesor ve las suyas"
  on public.negociacion for select
  to authenticated
  using (
    exists (select 1 from public.participacion_asesor p
            where p.id_negociacion = negociacion.id and p.id_asesor = (select auth.uid()))
    or exists (select 1 from public.inmueble i
               where i.id = negociacion.id_inmueble and i.id_asesor = (select auth.uid()))
  );

-- usuario: el asesor ve a los clientes con los que tiene negociaciones (la política de negociacion ya filtra).
-- 20261101160000_cartera_clientes.sql la amplía a su cartera y a los propietarios de sus inmuebles.
-- movimiento_financiero sigue sin políticas: el panel toma la fecha de negociacion.fecha_operacion.
drop policy if exists "usuario: el asesor ve a sus clientes" on public.usuario;
create policy "usuario: el asesor ve a sus clientes"
  on public.usuario for select
  to authenticated
  using (rol = 1 and exists (select 1 from public.negociacion n where n.id_cliente = usuario.id));

create index if not exists participacion_asesor_id_asesor_idx on public.participacion_asesor (id_asesor);
create index if not exists participacion_asesor_id_negociacion_idx on public.participacion_asesor (id_negociacion);
create index if not exists negociacion_id_inmueble_idx on public.negociacion (id_inmueble);
create index if not exists negociacion_id_cliente_idx on public.negociacion (id_cliente);
