import supabase from '../supabase/client';
import { authError, isRateLimited, TOO_MANY_EMAILS } from './auth';

// Datos de contacto del usuario con sesión desde public.usuario (la RLS solo deja leer la fila propia).
export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('usuario')
    .select('nombre, correo, telefono, whatsapp')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return { name: data.nombre, email: data.correo, phone: data.telefono, whatsapp: data.whatsapp };
}

// Edita nombre, teléfono y, si se envía (solo asesores), whatsapp.
// La base solo deja actualizar esas columnas de la fila propia.
export async function updateMyProfile(userId, { name, phone, whatsapp }) {
  const changes = { nombre: name.trim(), telefono: phone.trim() || null };
  if (whatsapp !== undefined) changes.whatsapp = whatsapp.trim() || null;
  const { data, error } = await supabase
    .from('usuario')
    .update(changes)
    .eq('id', userId)
    .select('nombre, correo, telefono, whatsapp')
    .single();
  if (error) throw error;
  return { name: data.nombre, email: data.correo, phone: data.telefono, whatsapp: data.whatsapp };
}

// Pide el cambio de correo a Supabase Auth, que envía un enlace de confirmación.
// Al confirmarlo, el trigger de la base copia el nuevo correo a public.usuario.
export async function requestEmailChange(email) {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
  if (error?.code === 'email_exists') throw authError('Ese correo ya está registrado en otra cuenta.');
  if (isRateLimited(error)) throw authError(TOO_MANY_EMAILS);
  if (error) throw error;
}
