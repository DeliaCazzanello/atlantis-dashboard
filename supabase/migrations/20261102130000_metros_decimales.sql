-- Metros cuadrados con decimales (85,5 m²) y sin el tope de 32.767 del smallint (terrenos grandes).
-- Los valores enteros que ya existen se conservan tal cual.
alter table public.inmueble
  alter column metros_cuadrados type numeric(10, 2);
