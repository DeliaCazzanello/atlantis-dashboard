-- Los inmuebles ya no se borran: se desactivan.
-- Borrar no sirve: negociacion y favorito apuntan al inmueble, y perderlo dejaría comisiones e historial
-- sin su inmueble. Un inmueble inactivo sale del catálogo pero se conserva con todo lo que lo referencia.
-- Se puede ejecutar más de una vez. Requiere 20261101120000 (atlantis-web) y 20261101150000.

alter table public.inmueble add column if not exists activo boolean not null default true;

-- ¿El asesor con sesión participa en alguna negociación de este inmueble?
-- security definer: la política de inmueble no puede consultar negociacion directamente, porque la
-- política de negociacion consulta inmueble (recursión infinita en RLS).
create or replace function private.inmueble_en_mis_negociaciones(p_id_inmueble bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.negociacion n
    join public.participacion_asesor p on p.id_negociacion = n.id
    where n.id_inmueble = p_id_inmueble and p.id_asesor = (select auth.uid())
  );
$$;

grant execute on function private.inmueble_en_mis_negociaciones(bigint) to anon, authenticated;

-- Catálogo: todos ven los inmuebles activos. Los inactivos solo los ve su asesor y quien participó
-- en sus negociaciones (para que sus comisiones sigan mostrando el inmueble).
-- Reemplaza "catalogo: todos ven los inmuebles" de 20261101120000_rls_modulo_clientes.sql.
drop policy if exists "catalogo: todos ven los inmuebles" on public.inmueble;
drop policy if exists "catalogo: se ven los inmuebles activos" on public.inmueble;
create policy "catalogo: se ven los inmuebles activos"
  on public.inmueble for select
  to anon, authenticated
  using (
    activo
    or id_asesor = (select auth.uid())
    or private.inmueble_en_mis_negociaciones(id)
  );

-- La política de borrado de 20261101150000 se mantiene solo para deshacer un registro que falló
-- a medias (inmueble recién creado, sin negociaciones ni favoritos); el panel ya no ofrece eliminar.

create index if not exists inmueble_activo_idx on public.inmueble (activo) where activo;
