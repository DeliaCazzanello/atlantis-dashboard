import supabase from '../supabase/client';

// public.usuario.rol → rol de la app. Este panel solo conoce a los asesores: para él, una cuenta
// de cliente (rol 1) no existe. Los clientes entran por atlantis-web.
const ROLES = { 2: 'asesor' };

// Mismo mensaje para contraseña incorrecta, cuenta inexistente y cuenta de cliente:
// el panel no revela si un correo está registrado en Atlantis.
const INVALID_LOGIN = 'Correo o contraseña incorrectos.';

// Copia local del usuario (id, nombre, rol) para mostrar el panel al instante al reabrir la app,
// sin esperar la consulta a public.usuario. Solo decide qué pantallas ver: los datos los protege la RLS.
// Se guarda en localStorage, igual que la sesión de Supabase, y se borra al cerrar sesión.
const CACHE_KEY = 'atlantis.user';

function saveCachedUser(user) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    // Sin almacenamiento (modo privado estricto): la app solo pierde el arranque instantáneo.
  }
}

function clearCachedUser() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Igual que arriba.
  }
}

// Actualiza el usuario guardado tras editar el perfil (p. ej. un nombre nuevo).
export const rememberUser = saveCachedUser;

// Usuario guardado de la última sesión confirmada, o null. Síncrono para usarlo en el primer render.
export function getCachedUser() {
  try {
    const user = JSON.parse(localStorage.getItem(CACHE_KEY));
    const valid = user && typeof user.id === 'string' && typeof user.name === 'string'
      && Object.values(ROLES).includes(user.role);
    return valid ? user : null;
  } catch {
    return null;
  }
}

// Error con un mensaje listo para mostrar al usuario.
export function authError(message) {
  const error = new Error(message);
  error.userMessage = message;
  return error;
}

// Supabase limita los correos que envía (confirmaciones, cambio de correo) y responde 429.
export const TOO_MANY_EMAILS = 'Enviamos demasiados correos en poco tiempo. Espera unos minutos e intenta de nuevo.';
export const isRateLimited = (error) => error?.status === 429 || /rate_limit/.test(error?.code ?? '');

// Sesión de Auth → asesor del panel, con nombre desde public.usuario (la RLS deja leer la fila propia).
async function toAppUser(authUser) {
  const { data, error } = await supabase
    .from('usuario')
    .select('nombre, rol')
    .eq('id', authUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !ROLES[data.rol]) {
    // Sin fila o sin rol de asesor (un cliente): para este panel la cuenta no existe.
    // Se cierra la sesión para no dejarla abierta en el navegador.
    clearCachedUser();
    await supabase.auth.signOut();
    throw authError(INVALID_LOGIN);
  }
  const user = { id: authUser.id, email: authUser.email, name: data.nombre, role: ROLES[data.rol] };
  saveCachedUser(user);
  return user;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  // Un correo sin confirmar también da el mensaje genérico: decir "confirma tu correo" revelaría que la
  // cuenta existe. Las cuentas de asesor las crea Atlantis ya confirmadas.
  if (error?.code === 'invalid_credentials' || error?.code === 'email_not_confirmed') throw authError(INVALID_LOGIN);
  if (error) throw error;
  return toAppUser(data.user);
}

// Cambia la contraseña tras comprobar la actual: con la sesión abierta en un equipo compartido
// no basta para cambiarla. Volver a iniciar sesión también deja la sesión reciente, que Supabase
// exige si está activo "Secure password change".
export async function changePassword(email, currentPassword, newPassword) {
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (check.error?.code === 'invalid_credentials') throw authError('La contraseña actual no es correcta.');
  if (check.error) throw check.error;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error?.code === 'same_password') throw authError('La nueva contraseña debe ser distinta de la actual.');
  if (error?.code === 'weak_password') throw authError('La nueva contraseña es muy débil. Usa al menos 6 caracteres.');
  if (error) throw error;
}

export async function logout() {
  clearCachedUser();
  await supabase.auth.signOut();
}

// Sesión guardada por Supabase (se renueva sola); null si no hay.
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    clearCachedUser();
    return null;
  }
  return toAppUser(data.session.user);
}

// Avisa cuando la sesión termina fuera de la app (expiró o se cerró en otra pestaña). Devuelve la función para dejar de escuchar.
export function onSignOut(callback) {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return;
    clearCachedUser();
    callback();
  });
  return () => data.subscription.unsubscribe();
}
