import supabase from '../supabase/client';
import { authError } from './auth';
import { getMyDeals } from './advisor';
import { clientsFromDeals } from '../lib';
const COLUMNS = 'id, nombre, correo, telefono';

// Cartera del asesor: clientes de sus negociaciones más los que registró (tabla asesor_cliente).
export async function getMyClients(advisorId) {
  const deals = await getMyDeals(advisorId);
  const { data, error } = await supabase
    .from('asesor_cliente')
    .select(`cliente:id_cliente(${COLUMNS})`)
    .eq('id_asesor', advisorId);
  if (error) throw error;
  return clientsFromDeals(deals, data.map((row) => row.cliente).filter(Boolean));
}

// Registra un cliente en la cartera (función registrar_cliente de la base). La persona queda con una ficha
// sin cuenta; cuando se registre en atlantis-web con ese correo, su cuenta toma esta ficha.
// Si el correo ya era de un cliente, no lo duplica: lo agrega a la cartera. Devuelve { cliente, yaExistia }.
export async function registerClient({ nombre, correo, telefono }) {
  const email = correo.trim().toLowerCase();
  const { data, error } = await supabase
    .rpc('registrar_cliente', { p_nombre: nombre.trim(), p_correo: email, p_telefono: telefono?.trim() ?? '' })
    .single();
  // La función responde con mensajes listos para mostrar (raise exception → código P0001).
  if (error?.code === 'P0001') throw authError(error.message);
  if (error) throw error;
  const { ya_existia: yaExistia, ...cliente } = data;
  return { cliente, yaExistia };
}

// Clientes registrados que coinciden por nombre o correo (mínimo 2 letras), para elegir un propietario.
export async function searchClients(text) {
  const q = text.trim().toLowerCase();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('buscar_clientes', { p_texto: q });
  if (error) throw error;
  return data;
}

// El asesor corrige nombre y teléfono de un cliente de su cartera; el correo solo lo cambia el cliente.
export async function updateClient(client, { nombre, telefono }) {
  const changes = { nombre: nombre.trim(), telefono: telefono.trim() || null };
  const { data, error } = await supabase.from('usuario').update(changes).eq('id', client.id).select('id');
  if (error) throw error;
  if (!data.length) throw authError('No tienes permiso para editar este cliente.');
}

// Quita de la cartera a un cliente registrado por el asesor. Su cuenta sigue existiendo.
export async function removeClient(advisorId, client) {
  const { error } = await supabase
    .from('asesor_cliente')
    .delete()
    .eq('id_asesor', advisorId)
    .eq('id_cliente', client.id);
  if (error) throw error;
}
