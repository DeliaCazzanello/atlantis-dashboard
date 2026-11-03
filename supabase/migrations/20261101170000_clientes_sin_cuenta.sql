-- Clientes y propietarios registrados por un asesor, sin cuenta todavía.
-- Se puede ejecutar más de una vez. Requiere 20261101120000 (atlantis-web), 20261101150000 y 20261101160000.
--
-- Flujo:
--   1. El asesor registra a un cliente (desde Mis clientes o como propietario de un inmueble):
--      se crea su fila en public.usuario con un uuid propio, sin fila en auth.users.
--   2. Si más adelante esa persona se registra en atlantis-web con el mismo correo, al confirmar
--      el correo su ficha pasa a usar el id de su cuenta (usuario.id = auth.users.id, como espera la app),
--      y todo lo que la referenciaba (inmuebles, negociaciones, favoritos…) la sigue por ON UPDATE CASCADE.
--
-- IMPORTANTE: reemplaza private.crear_usuario_cliente(), el trigger de registro de atlantis-web.
-- Copia también este archivo a atlantis-web/supabase/migrations para que ambos repos queden iguales.

-- ---------------------------------------------------------------------------
-- 1. Llaves foráneas
-- ---------------------------------------------------------------------------
-- usuario ya no exige una cuenta en auth.users: las fichas sin cuenta son justamente las que crea el asesor.
alter table public.usuario drop constraint if exists usuario_id_fkey;

-- El propietario es una persona de public.usuario (con o sin cuenta), no una cuenta de auth.users.
-- NOT VALID: no revisa las filas que ya existían (algún propietario podría no tener ficha); sí las nuevas.
alter table public.inmueble drop constraint if exists inmueble_id_propietario_fkey;
alter table public.inmueble
  add constraint inmueble_id_propietario_fkey
  foreign key (id_propietario) references public.usuario (id) on update cascade not valid;

-- Las referencias a usuario siguen a la ficha cuando cambia de id al unirse con su cuenta.
alter table public.negociacion drop constraint if exists negociacion_id_cliente_fkey;
alter table public.negociacion
  add constraint negociacion_id_cliente_fkey
  foreign key (id_cliente) references public.usuario (id) on update cascade;

alter table public.favorito drop constraint if exists favorito_id_cliente_fkey;
alter table public.favorito
  add constraint favorito_id_cliente_fkey
  foreign key (id_cliente) references public.usuario (id) on update cascade;

alter table public.busqueda drop constraint if exists busqueda_id_cliente_fkey;
alter table public.busqueda
  add constraint busqueda_id_cliente_fkey
  foreign key (id_cliente) references public.usuario (id) on update cascade;

alter table public.preferencias drop constraint if exists preferencias_id_cliente_fkey;
alter table public.preferencias
  add constraint preferencias_id_cliente_fkey
  foreign key (id_cliente) references public.usuario (id) on update cascade;

alter table public.asesor_cliente drop constraint if exists asesor_cliente_id_asesor_fkey;
alter table public.asesor_cliente
  add constraint asesor_cliente_id_asesor_fkey
  foreign key (id_asesor) references public.usuario (id) on update cascade on delete cascade;

alter table public.asesor_cliente drop constraint if exists asesor_cliente_id_cliente_fkey;
alter table public.asesor_cliente
  add constraint asesor_cliente_id_cliente_fkey
  foreign key (id_cliente) references public.usuario (id) on update cascade on delete cascade;

create index if not exists usuario_correo_idx on public.usuario (lower(correo));
create index if not exists inmueble_id_propietario_idx on public.inmueble (id_propietario);

-- ---------------------------------------------------------------------------
-- 2. Registro en atlantis-web: crea la ficha o toma la que dejó un asesor
-- ---------------------------------------------------------------------------
-- Ficha de cliente con ese correo que aún no tiene cuenta.
create or replace function private.ficha_sin_cuenta(p_correo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.usuario u
  where lower(u.correo) = lower(p_correo)
    and u.rol = 1
    and not exists (select 1 from auth.users a where a.id = u.id)
  limit 1;
$$;

-- Se ejecuta al crear la cuenta y al confirmar el correo.
-- La ficha del asesor solo se toma con el correo CONFIRMADO: si no, cualquiera podría registrarse
-- con el correo de otra persona (sin poder abrirlo) y quedarse con su ficha.
create or replace function private.crear_usuario_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pendiente uuid := private.ficha_sin_cuenta(new.email);
begin
  if pendiente is not null then
    if new.email_confirmed_at is null then
      return new; -- espera la confirmación; el trigger al_confirmar_correo vuelve a llamar aquí
    end if;
    -- El nombre y teléfono que escribió la persona al registrarse mandan sobre los del asesor.
    update public.usuario
    set id = new.id,
        nombre = coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), nombre),
        telefono = coalesce(nullif(trim(new.raw_user_meta_data ->> 'telefono'), ''), telefono)
    where id = pendiente;
    return new;
  end if;

  -- Sin ficha previa: igual que antes, se crea como cliente (el rol nunca sale del metadata).
  insert into public.usuario (id, nombre, correo, telefono, whatsapp, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), new.email),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'telefono'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'whatsapp'), ''),
    1
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_registrar_usuario on auth.users;
create trigger al_registrar_usuario
  after insert on auth.users
  for each row execute function private.crear_usuario_cliente();

drop trigger if exists al_confirmar_correo on auth.users;
create trigger al_confirmar_correo
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.crear_usuario_cliente();

-- ---------------------------------------------------------------------------
-- 3. Funciones que llama el panel del asesor
-- ---------------------------------------------------------------------------
-- Registra un cliente en la cartera del asesor. Si ya existe un cliente con ese correo (con o sin cuenta)
-- no lo duplica: lo agrega a la cartera. Devuelve la ficha y si ya existía.
-- security definer: el asesor no puede insertar en usuario directamente (podría crear filas con rol = 2).
create or replace function public.registrar_cliente(p_nombre text, p_correo text, p_telefono text default null)
returns table (id uuid, nombre varchar, correo varchar, telefono varchar, ya_existia boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text := lower(trim(coalesce(p_correo, '')));
  v_id uuid;
  v_rol smallint;
begin
  if not private.es_asesor() then
    raise exception 'Solo los asesores pueden registrar clientes.';
  end if;
  if trim(coalesce(p_nombre, '')) = '' then
    raise exception 'Escribe el nombre del cliente.';
  end if;
  if v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Escribe un correo válido.';
  end if;

  select u.id, u.rol into v_id, v_rol from public.usuario u where lower(u.correo) = v_correo limit 1;
  if v_rol = 2 then
    raise exception 'Ese correo pertenece a un asesor, no a un cliente.';
  end if;

  if v_id is null then
    insert into public.usuario (nombre, correo, telefono, rol)
    values (trim(p_nombre), v_correo, nullif(trim(coalesce(p_telefono, '')), ''), 1)
    returning usuario.id into v_id;
    ya_existia := false;
  else
    ya_existia := true;
  end if;

  insert into public.asesor_cliente (id_asesor, id_cliente)
  values ((select auth.uid()), v_id)
  on conflict do nothing;

  return query
    select u.id, u.nombre, u.correo, u.telefono, ya_existia from public.usuario u where u.id = v_id;
end;
$$;

revoke all on function public.registrar_cliente(text, text, text) from public, anon;
grant execute on function public.registrar_cliente(text, text, text) to authenticated;

-- Busca clientes registrados por nombre o correo para elegir el propietario de un inmueble.
-- Solo asesores; mínimo 2 letras y 8 resultados, para que no sirva para listar a todos los clientes.
create or replace function public.buscar_clientes(p_texto text)
returns table (id uuid, nombre varchar, correo varchar, telefono varchar)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    -- % y _ escritos por el asesor se buscan como texto, no como comodines
    select replace(replace(replace(trim(coalesce(p_texto, '')), '\', '\\'), '%', '\%'), '_', '\_') as t
  )
  select u.id, u.nombre, u.correo, u.telefono
  from public.usuario u, q
  where private.es_asesor()
    and u.rol = 1
    and length(q.t) >= 2
    and (u.nombre ilike '%' || q.t || '%' or u.correo ilike '%' || q.t || '%')
  order by u.nombre
  limit 8;
$$;

revoke all on function public.buscar_clientes(text) from public, anon;
grant execute on function public.buscar_clientes(text) to authenticated;
