import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { changePassword } from '../services/auth';
import { getMyProfile, requestEmailChange, updateMyProfile } from '../services/users';

jest.mock('../services/auth', () => ({ changePassword: jest.fn() }));
jest.mock('../services/users', () => ({
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  requestEmailChange: jest.fn(),
}));

const USER = { id: 'u1', name: 'Liobel Henríquez', role: 'asesor' };
const PROFILE = { name: 'Liobel Henríquez', email: 'liobel@atlantis.com', phone: '+58 414 111 2222', whatsapp: null };
const type = (form, label, value) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
  getMyProfile.mockResolvedValue(PROFILE);
});

test('guarda los datos, actualiza el nombre de la sesión y no pide cambio de correo si no cambió', async () => {
  updateMyProfile.mockImplementation(async (id, form) => ({ ...PROFILE, name: form.name.trim(), whatsapp: form.whatsapp }));
  const onUserChange = jest.fn();
  render(<MemoryRouter><ProfilePage user={USER} onUserChange={onUserChange} /></MemoryRouter>);

  const form = await screen.findByRole('form', { name: 'Datos personales' });
  type(form, 'Nombre completo', 'Liobel H.');
  type(form, 'Enlace de WhatsApp (opcional)', '+58 412 555 0000');
  fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }));
  expect(within(form).getByRole('alert')).toHaveTextContent('enlace de WhatsApp válido');

  type(form, 'Enlace de WhatsApp (opcional)', 'https://wa.me/584125550000');
  fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Tus datos se guardaron.');
  expect(requestEmailChange).not.toHaveBeenCalled();
  expect(onUserChange).toHaveBeenCalledWith({ ...USER, name: 'Liobel H.' });
  expect(screen.getByRole('heading', { level: 2, name: 'Liobel H.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Escribir por WhatsApp' })).toHaveAttribute('href', 'https://wa.me/584125550000');
});

test('cambiar contraseña valida que coincidan y usa el correo guardado', async () => {
  changePassword.mockResolvedValue();
  render(<MemoryRouter><ProfilePage user={USER} onUserChange={jest.fn()} /></MemoryRouter>);

  const form = await screen.findByRole('form', { name: 'Seguridad' });
  type(form, 'Contraseña actual', 'vieja1');
  type(form, 'Nueva contraseña', 'nueva12');
  type(form, 'Repite la nueva contraseña', 'otra12');
  fireEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }));
  expect(within(form).getByRole('alert')).toHaveTextContent('no coinciden');

  type(form, 'Repite la nueva contraseña', 'nueva12');
  fireEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Tu contraseña se cambió.');
  expect(changePassword).toHaveBeenCalledWith('liobel@atlantis.com', 'vieja1', 'nueva12');
  expect(within(form).getByLabelText('Contraseña actual')).toHaveValue('');
});
