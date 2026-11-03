import { clientsFromDeals, findLocation, formatDate, monthlySeries, propertyStatus, uniqueLocations } from './lib';

test('las ubicaciones escritas de distinta forma cuentan como una sola', () => {
  const list = uniqueLocations(['Unare', ' las peonias ', 'Las Peonías', 'Las Peonías', null, '', 'Alta  Vista']);
  expect(list).toEqual(['Alta Vista', 'Las Peonías', 'Unare']);
  expect(findLocation(list, 'LAS PEONIAS')).toBe('Las Peonías');
  expect(findLocation(list, 'Los Olivos')).toBeUndefined();
});

test('el estado del inmueble sale del estado comercial de sus operaciones', () => {
  const ops = (...estados) => ({ inmueble_modalidad: estados.map((estado_comercial) => ({ estado_comercial })) });
  expect(propertyStatus(ops()).key).toBe('disponible');
  expect(propertyStatus(ops('Disponible')).key).toBe('disponible');
  expect(propertyStatus(ops('Disponible', 'En negociación')).key).toBe('negociacion');
  expect(propertyStatus(ops('Alquilado', 'Disponible')).label).toBe('Alquilado');
  expect(propertyStatus(ops('Alquilado', 'vendido')).key).toBe('vendido'); // sin importar mayúsculas
  expect(propertyStatus(ops('algo raro')).key).toBe('disponible');
});

test('un inmueble inactivo se muestra inactivo aunque esté vendido', () => {
  expect(propertyStatus({ activo: false, inmueble_modalidad: [{ estado_comercial: 'Vendido' }] }))
    .toEqual({ key: 'inactivo', label: 'Inactivo' });
});

test('la serie mensual suma por mes de cierre e ignora lo viejo y lo abierto', () => {
  const deals = [
    { fecha: '2026-06-15', comision: 5000 },
    { fecha: '2026-06-02', comision: 1000 },
    { fecha: '2026-01-10', comision: 999 }, // fuera de los 6 meses
    { fecha: null, comision: 777 }, // en curso
  ];
  const series = monthlySeries(deals, (d) => d.comision, { now: new Date(2026, 6, 20) });
  expect(series.map((b) => b.label)).toEqual(['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul']);
  expect(series.find((b) => b.label === 'Jun').value).toBe(6000);
  expect(series.reduce((s, b) => s + b.value, 0)).toBe(6000);
});

test('los clientes se agrupan sin repetirse', () => {
  const ana = { id: 'a', nombre: 'Ana' };
  const clients = clientsFromDeals([{ cliente: ana }, { cliente: ana }, { cliente: null }, { cliente: { id: 'b', nombre: 'Beto' } }]);
  expect(clients).toEqual([
    { ...ana, negociaciones: 2, enCartera: false },
    { id: 'b', nombre: 'Beto', negociaciones: 1, enCartera: false },
  ]);
});

test('la cartera suma los clientes registrados por el asesor aunque no tengan negociaciones', () => {
  const ana = { id: 'a', nombre: 'Ana' };
  const clients = clientsFromDeals([{ cliente: ana }], [ana, { id: 'c', nombre: 'Carla' }]);
  expect(clients).toEqual([
    { ...ana, negociaciones: 1, enCartera: true },
    { id: 'c', nombre: 'Carla', negociaciones: 0, enCartera: true },
  ]);
});

test('formatDate no corre el día por zona horaria', () => {
  expect(formatDate('2026-06-15')).toBe('15 Jun 2026');
  expect(formatDate(null)).toBe('En curso');
});
