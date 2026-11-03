import supabase from '../supabase/client';
import { authError } from './auth';
import { compressImage } from './images';

// De la más reciente a la más vieja.
const byDate = (a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '');

// La primera imagen del inmueble es la portada; sin fotos se usa la de muestra.
const cover = (imagenes) => (Array.isArray(imagenes) && imagenes[0]) || '/img/house.jpg';

// Ubicaciones de los inmuebles que la RLS deja ver (catálogo y los propios), para sugerirlas al escribir.
// shortcut: trae una fila por inmueble; si pasan de unos miles, mover el distinct a una vista o RPC.
export async function getLocations() {
  const { data, error } = await supabase.from('inmueble').select('ubicacion');
  if (error) throw error;
  return data.map((row) => row.ubicacion);
}

// Inmuebles captados por el asesor (activos e inactivos), con su propietario y sus precios
// y estado por operación.
const PROPERTY_FIELDS = 'id, titulo, descripcion, tipo, ubicacion, metros_cuadrados, habitaciones, baños, imagenes, estatus_legal, activo, '
  + 'propietario:id_propietario(id, nombre, correo, telefono), '
  + 'inmueble_modalidad(id, tipo_operacion, precio, estado_comercial)';

const toProperty = (row) => ({
  ...row,
  imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
  foto: cover(row.imagenes),
});

export async function getMyProperties(advisorId) {
  const { data, error } = await supabase
    .from('inmueble')
    .select(PROPERTY_FIELDS)
    .eq('id_asesor', advisorId)
    .order('id', { ascending: false });
  if (error) throw error;
  return data.map(toProperty);
}

// Un inmueble del asesor, o null si no existe o lo captó otro asesor.
export async function getMyProperty(advisorId, id) {
  const { data, error } = await supabase
    .from('inmueble')
    .select(PROPERTY_FIELDS)
    .eq('id_asesor', advisorId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data && toProperty(data);
}

// Bucket público de Storage para las fotos (lo crea supabase/migrations/*_registro_inmuebles.sql).
const BUCKET = 'inmuebles';

// fotos: archivos nuevos (File) o URLs de fotos ya guardadas. Comprime y sube los nuevos y
// devuelve todas como URLs públicas en el mismo orden (la primera es la portada).
function uploadPhotos(advisorId, fotos) {
  return Promise.all(fotos.map(async (foto, i) => {
    if (typeof foto === 'string') return foto;
    const file = await compressImage(foto);
    // La carpeta con el id del asesor es la que la política de Storage le deja escribir.
    const path = `${advisorId}/${Date.now()}-${i}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) throw authError(`No se pudo subir "${foto.name}". Usa fotos JPG, PNG o WebP.`);
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }));
}

// Borra de Storage las fotos que ya no usa ningún inmueble. Solo toca las de este bucket;
// si falla, el inmueble ya quedó bien y solo sobra un archivo, así que no se interrumpe al asesor.
async function removePhotos(urls) {
  const marker = `/object/public/${BUCKET}/`;
  const paths = urls.filter((url) => url.includes(marker)).map((url) => decodeURIComponent(url.split(marker)[1]));
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

// Registra un inmueble del asesor con sus precios (inmueble + inmueble_modalidad) y sus fotos.
// propietario: ficha de public.usuario ya registrada (registerClient), con su id.
export async function createProperty(advisorId, { fotos, modalidades, propietario, ...fields }) {
  const imagenes = await uploadPhotos(advisorId, fotos);
  const { data, error } = await supabase
    .from('inmueble')
    .insert({ ...fields, imagenes, id_propietario: propietario.id, id_asesor: advisorId })
    .select('id')
    .single();
  if (error) throw error;
  const { error: priceError } = await supabase
    .from('inmueble_modalidad')
    .insert(modalidades.map((m) => ({ ...m, id_inmueble: data.id })));
  if (priceError) {
    // Sin precios el inmueble quedaría a medias en el catálogo: se borra y se avisa.
    await supabase.from('inmueble').delete().eq('id', data.id);
    throw priceError;
  }
}

// Edita un inmueble del asesor: datos, fotos y precios.
// property: el inmueble tal como lo devuelve getMyProperties (trae los ids de sus precios y sus fotos).
export async function updateProperty(advisorId, property, { fotos, modalidades, propietario, ...fields }) {
  const imagenes = await uploadPhotos(advisorId, fotos);
  const { error } = await supabase
    .from('inmueble')
    .update({ ...fields, imagenes, id_propietario: propietario.id })
    .eq('id', property.id);
  if (error) throw error;

  // Precios por operación: se actualiza el que ya existe, se agrega el nuevo y se borra el que se quitó.
  // Así el inmueble nunca queda sin precio a mitad del cambio.
  for (const m of modalidades) {
    const current = property.inmueble_modalidad.find((c) => c.tipo_operacion === m.tipo_operacion);
    const { error: priceError } = current
      ? await supabase.from('inmueble_modalidad').update({ precio: m.precio, estado_comercial: m.estado_comercial }).eq('id', current.id)
      : await supabase.from('inmueble_modalidad').insert({ ...m, id_inmueble: property.id });
    if (priceError) throw priceError;
  }
  const removed = property.inmueble_modalidad
    .filter((c) => !modalidades.some((m) => m.tipo_operacion === c.tipo_operacion))
    .map((c) => c.id);
  if (removed.length) {
    const { error: removeError } = await supabase.from('inmueble_modalidad').delete().in('id', removed);
    if (removeError) throw removeError;
  }
  await removePhotos(property.imagenes.filter((url) => !imagenes.includes(url)));
}

// Activa o desactiva un inmueble del asesor. Inactivo sale del catálogo, pero se conserva con sus
// negociaciones, comisiones y favoritos (por eso no se borra: lo referencian).
export async function setPropertyActive(property, activo) {
  const { data, error } = await supabase.from('inmueble').update({ activo }).eq('id', property.id).select('id');
  if (error) throw error;
  if (!data.length) throw authError('No tienes permiso para cambiar este inmueble.');
}

// Negociaciones donde participa el asesor, con su comisión, el inmueble y el cliente.
// Requiere las políticas de supabase/migrations/*_rls_modulo_asesores.sql.
export async function getMyDeals(advisorId) {
  const { data, error } = await supabase
    .from('participacion_asesor')
    .select('id, porcentaje_comision, monto_comision, negociacion(id_inmueble, tipo_operacion, precio_final, '
      + 'fecha_operacion, cliente:id_cliente(id, nombre, correo, telefono))')
    .eq('id_asesor', advisorId);
  if (error) throw error;
  const rows = data.filter((row) => row.negociacion);

  const ids = [...new Set(rows.map((row) => row.negociacion.id_inmueble).filter(Boolean))];
  const { data: properties, error: propError } = ids.length
    ? await supabase.from('inmueble').select('id, titulo, tipo, imagenes').in('id', ids)
    : { data: [] };
  if (propError) throw propError;

  return rows
    .map(({ id, porcentaje_comision, monto_comision, negociacion: n }) => {
      const inmueble = properties.find((p) => p.id === n.id_inmueble);
      return {
        id,
        porcentaje: Number(porcentaje_comision ?? 0),
        comision: Number(monto_comision ?? 0),
        precioFinal: Number(n.precio_final ?? 0),
        operacion: n.tipo_operacion,
        fecha: n.fecha_operacion,
        inmueble: inmueble && { ...inmueble, foto: cover(inmueble.imagenes) },
        cliente: n.cliente,
      };
    })
    .sort(byDate);
}
