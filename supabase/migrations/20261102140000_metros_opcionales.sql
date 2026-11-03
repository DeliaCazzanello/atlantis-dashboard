-- Metros cuadrados opcionales: el asesor puede registrar el inmueble sin conocerlos todavía.
alter table public.inmueble
  alter column metros_cuadrados drop not null;
