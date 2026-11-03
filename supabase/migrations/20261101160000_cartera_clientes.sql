-- Cartera de clientes del asesor: los que registra desde el panel, aunque aún no tengan negociaciones.
-- Se puede ejecutar más de una vez. Requiere 20261101140000_rls_modulo_asesores.sql.
-- Las filas las crea la función registrar_cliente (20261101170000_clientes_sin_cuenta.sql);
-- desde la app el asesor solo puede verlas y quitarlas.

create table if not exists public.asesor_cliente (
  id_asesor uuid not null references public.usuario (id) on update cascade on delete cascade,
  id_cliente uuid not null references public.usuario (id) on update cascade on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (id_asesor, id_cliente)
);

create index if not exists asesor_cliente_id_cliente_idx on public.asesor_cliente (id_cliente);

alter table public.asesor_cliente enable row level security;

drop policy if exists "cartera: el asesor ve la suya" on public.asesor_cliente;
create policy "cartera: el asesor ve la suya"
  on public.asesor_cliente for select
  to authenticated
  using (id_asesor = (select auth.uid()));

drop policy if exists "cartera: el asesor quita clientes de la suya" on public.asesor_cliente;
create policy "cartera: el asesor quita clientes de la suya"
  on public.asesor_cliente for delete
  to authenticated
  using (id_asesor = (select auth.uid()));

-- usuario: el asesor ve a los clientes de su cartera, de sus negociaciones o que son propietarios
-- de sus inmuebles (reemplaza la política de 20261101140000).
drop policy if exists "usuario: el asesor ve a sus clientes" on public.usuario;
create policy "usuario: el asesor ve a sus clientes"
  on public.usuario for select
  to authenticated
  using (
    rol = 1 and (
      exists (select 1 from public.asesor_cliente c where c.id_cliente = usuario.id and c.id_asesor = (select auth.uid()))
      or exists (select 1 from public.negociacion n where n.id_cliente = usuario.id)
      or exists (select 1 from public.inmueble i where i.id_propietario = usuario.id and i.id_asesor = (select auth.uid()))
    )
  );

-- usuario: y puede corregir sus datos. Los permisos de columna (20261101120000) ya limitan
-- el cambio a nombre, telefono y whatsapp: ni rol ni correo.
drop policy if exists "usuario: el asesor edita a sus clientes" on public.usuario;
create policy "usuario: el asesor edita a sus clientes"
  on public.usuario for update
  to authenticated
  using (
    rol = 1 and (
      exists (select 1 from public.asesor_cliente c where c.id_cliente = usuario.id and c.id_asesor = (select auth.uid()))
      or exists (select 1 from public.negociacion n where n.id_cliente = usuario.id)
    )
  )
  with check (rol = 1);
