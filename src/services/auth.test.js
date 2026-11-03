import supabase from '../supabase/client';
import { getCachedUser, getSession, login, logout, onSignOut } from './auth';

// Cliente de Supabase falso: lo justo para auth.js.
jest.mock('../supabase/client', () => {
  const row = { current: null };
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row.current, error: null }) };
  return {
    __esModule: true,
    default: {
      row,
      from: () => query,
      auth: {
        signInWithPassword: jest.fn(),
        signOut: jest.fn(async () => ({})),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
    },
  };
});

const AUTH_USER = { id: 'u1', email: 'liobel@atlantis.com' };

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  supabase.row.current = { nombre: 'Liobel', rol: 2 };
});

test('un asesor inicia sesión, queda guardado y al cerrarla se borra', async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: AUTH_USER }, error: null });
  expect(await login(' Liobel@Atlantis.com ', 'secreta')).toEqual({ id: 'u1', email: 'liobel@atlantis.com', name: 'Liobel', role: 'asesor' });
  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'liobel@atlantis.com', password: 'secreta' });
  expect(getCachedUser()).toMatchObject({ id: 'u1', role: 'asesor' });

  await logout();
  expect(getCachedUser()).toBeNull();
});

test('una cuenta de cliente (rol 1) se trata como inexistente y se cierra su sesión', async () => {
  supabase.row.current = { nombre: 'Ana', rol: 1 };
  supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: AUTH_USER }, error: null });
  await expect(login('ana@x.com', 'buena')).rejects.toMatchObject({ userMessage: 'Correo o contraseña incorrectos.' });
  expect(supabase.auth.signOut).toHaveBeenCalled();
  expect(getCachedUser()).toBeNull();
});

test('credenciales incorrectas o correo sin confirmar dan el mismo mensaje', async () => {
  for (const code of ['invalid_credentials', 'email_not_confirmed']) {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code } });
    // eslint-disable-next-line no-await-in-loop
    await expect(login('x@x.com', 'mala')).rejects.toMatchObject({ userMessage: 'Correo o contraseña incorrectos.' });
  }
  expect(getCachedUser()).toBeNull();
});

test('sin sesión en Supabase se borra el usuario guardado', async () => {
  localStorage.setItem('atlantis.user', JSON.stringify({ id: 'u1', name: 'Liobel', role: 'asesor' }));
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  expect(await getSession()).toBeNull();
  expect(getCachedUser()).toBeNull();
});

test('una cuenta sin perfil cierra la sesión y no queda guardada', async () => {
  supabase.row.current = null;
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: AUTH_USER } } });
  await expect(getSession()).rejects.toMatchObject({ userMessage: 'Correo o contraseña incorrectos.' });
  expect(supabase.auth.signOut).toHaveBeenCalled();
  expect(getCachedUser()).toBeNull();
});

test('un usuario guardado dañado o que no es asesor se ignora', () => {
  localStorage.setItem('atlantis.user', '{no es json');
  expect(getCachedUser()).toBeNull();
  localStorage.setItem('atlantis.user', JSON.stringify({ id: 'u1', name: 'Ana', role: 'cliente' }));
  expect(getCachedUser()).toBeNull();
});

test('si la sesión se cierra en otra pestaña se borra el usuario guardado', () => {
  let listener;
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    listener = cb;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
  localStorage.setItem('atlantis.user', JSON.stringify({ id: 'u1', name: 'Liobel', role: 'asesor' }));
  const onOut = jest.fn();
  onSignOut(onOut);
  listener('TOKEN_REFRESHED');
  expect(onOut).not.toHaveBeenCalled();
  listener('SIGNED_OUT');
  expect(onOut).toHaveBeenCalled();
  expect(getCachedUser()).toBeNull();
});
