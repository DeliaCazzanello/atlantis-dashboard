// Lógica de negocio pura: no conoce la fuente de datos ni React.

export const formatMoney = (n) => `$${Number(n ?? 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;
export const formatArea = (n) => `${Number(n ?? 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²`;

// Opciones del formulario de inmuebles (el valor guardado es el mismo texto que se muestra), como en atlantis-web.
export const PROPERTY_TYPES = ['Apartamento', 'Casa', 'Town House', 'Local', 'Terreno'];
// Sugerencias para inmueble.estatus_legal; el asesor también puede escribir otro.
export const LEGAL_STATUSES = ['Documentos en regla', 'En trámite', 'Con hipoteca', 'En sucesión'];
export const ZONES = ['Villa Bolivia', 'Alta Vista', 'Terrazas del Caroní', 'Castillito', 'Villa Betania', 'Unare'];

// Para comparar textos escritos a mano: sin tildes, sin mayúsculas y con espacios simples.
export const normalizeText = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Una sola escritura por ubicación: "Las peonias" y "Las Peonías" son la misma y queda la más usada
// (en empate, la primera de la lista). Ordenadas alfabéticamente.
export function uniqueLocations(list) {
  const groups = new Map(); // texto normalizado → { escritura: usos }
  list.forEach((raw) => {
    const text = raw?.trim().replace(/\s+/g, ' ');
    if (!text) return;
    const counts = groups.get(normalizeText(text)) ?? {};
    counts[text] = (counts[text] ?? 0) + 1;
    groups.set(normalizeText(text), counts);
  });
  return [...groups.values()]
    .map((counts) => Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0])
    .sort((a, b) => a.localeCompare(b, 'es'));
}

// La ubicación ya registrada que equivale a lo escrito, o undefined.
export const findLocation = (locations, text) => locations.find((l) => normalizeText(l) === normalizeText(text));

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// "2026-06-15" → "15 Jun 2026". Se lee como fecha local para no correr un día por la zona horaria.
export function formatDate(iso) {
  if (!iso) return 'En curso';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Estados comerciales de inmueble_modalidad.estado_comercial (se guarda el mismo texto que se muestra).
// El de cierre depende de la operación: una venta termina vendida y un alquiler, alquilado.
export const COMMERCIAL_STATES = {
  venta: ['Disponible', 'En negociación', 'Vendido'],
  alquiler: ['Disponible', 'En negociación', 'Alquilado'],
};

const STATUS_KEYS = { Vendido: 'vendido', Alquilado: 'alquilado', 'En negociación': 'negociacion', Disponible: 'disponible' };

// Estado de la tarjeta: Inactivo si salió del catálogo; si no, el estado más avanzado de sus operaciones
// (un inmueble vendido se muestra vendido aunque su alquiler siga disponible). Sin coincidencias, Disponible.
export function propertyStatus({ activo = true, inmueble_modalidad: modalidades = [] }) {
  if (activo === false) return { key: 'inactivo', label: 'Inactivo' };
  const estados = modalidades.map((m) => (m.estado_comercial ?? '').trim().toLowerCase());
  const label = ['Vendido', 'Alquilado', 'En negociación'].find((e) => estados.includes(e.toLowerCase())) ?? 'Disponible';
  return { key: STATUS_KEYS[label], label };
}

// Suma value(deal) por mes de cierre en los últimos `count` meses hasta `now` (incluido).
export function monthlySeries(deals, value, { count = 6, now = new Date() } = {}) {
  const buckets = Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[date.getMonth()], value: 0 };
  });
  for (const deal of deals) {
    const bucket = deal.fecha && buckets.find((b) => deal.fecha.startsWith(b.key));
    if (bucket) bucket.value += value(deal);
  }
  return buckets;
}

// Cartera del asesor: clientes de sus negociaciones (con cuántas tiene cada uno) más los que
// registró él mismo (enCartera), sin repetirse.
export function clientsFromDeals(deals, cartera = []) {
  const byId = new Map(cartera.map((c) => [c.id, { ...c, negociaciones: 0, enCartera: true }]));
  for (const deal of deals) {
    if (!deal.cliente) continue;
    const current = byId.get(deal.cliente.id) ?? { ...deal.cliente, negociaciones: 0, enCartera: false };
    current.negociaciones += 1;
    byId.set(deal.cliente.id, current);
  }
  return [...byId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
