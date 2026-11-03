import { fireEvent, render, screen, within } from '@testing-library/react';
import ClientsPage from './ClientsPage';
import { getMyClients, registerClient, removeClient, updateClient } from '../services/clients';

jest.mock('../services/clients', () => ({
  getMyClients: jest.fn(),
  registerClient: jest.fn(),
  updateClient: jest.fn(),
  removeClient: jest.fn(),
}));

const ANA = { id: 'a', nombre: 'Ana Martínez', correo: 'ana@gmail.com', telefono: '+58 414 111 2222', negociaciones: 2, enCartera: false };
const SOFIA = { id: 's', nombre: 'Sofía Linares', correo: 'sofia@gmail.com', telefono: null, negociaciones: 0, enCartera: true };
const type = (dialog, label, value) => fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
  getMyClients.mockResolvedValue([ANA, SOFIA]);
});

test('la tabla ya no muestra negociaciones y cada fila tiene su menú', async () => {
  render(<ClientsPage user={{ id: 'u1' }} />);
  await screen.findByText('Ana Martínez');
  expect(screen.queryByRole('columnheader', { name: 'Negociaciones' })).toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Modificar' })).toBeInTheDocument();

  // Quien tiene negociaciones no se puede quitar de la cartera; quien registró el asesor sí.
  fireEvent.click(screen.getByRole('button', { name: 'Opciones de Ana Martínez' }));
  expect(screen.getAllByRole('menuitem').map((i) => i.textContent.trim())).toEqual(['Editar datos']);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Opciones de Sofía Linares' }));
  expect(screen.getAllByRole('menuitem').map((i) => i.textContent.trim())).toEqual(['Editar datos', 'Quitar de mi cartera']);
});

test('registrar cliente valida el correo, guarda y avisa que quedó en la cartera', async () => {
  registerClient.mockResolvedValue({ cliente: { nombre: 'Luis Rojas', correo: 'luis@gmail.com' }, yaExistia: false });
  render(<ClientsPage user={{ id: 'u1' }} />);

  fireEvent.click(await screen.findByRole('button', { name: /Registrar cliente/ }));
  const dialog = screen.getByRole('dialog', { name: 'Registrar cliente' });
  type(dialog, 'Nombre completo', 'Luis Rojas');
  type(dialog, 'Correo electrónico', 'luis@');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }));
  expect(within(dialog).getByRole('alert')).toHaveTextContent('correo válido');
  expect(registerClient).not.toHaveBeenCalled();

  type(dialog, 'Correo electrónico', 'luis@gmail.com');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Luis Rojas se registró y se agregó a tu cartera');
  expect(registerClient).toHaveBeenCalledWith({ nombre: 'Luis Rojas', correo: 'luis@gmail.com', telefono: '' });
  expect(getMyClients).toHaveBeenCalledTimes(2);
});

test('editar no deja cambiar el correo y guarda nombre y teléfono', async () => {
  updateClient.mockResolvedValue();
  render(<ClientsPage user={{ id: 'u1' }} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Opciones de Ana Martínez' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Editar datos' }));
  const dialog = screen.getByRole('dialog', { name: 'Editar cliente' });
  expect(within(dialog).getByLabelText('Correo electrónico')).toBeDisabled();
  type(dialog, 'Teléfono (opcional)', '+58 412 000 1111');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Se guardaron los datos de Ana Martínez');
  expect(updateClient).toHaveBeenCalledWith(ANA, expect.objectContaining({ telefono: '+58 412 000 1111' }));
});

test('quitar de la cartera pide confirmación', async () => {
  removeClient.mockResolvedValue();
  render(<ClientsPage user={{ id: 'u1' }} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Opciones de Sofía Linares' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Quitar de mi cartera' }));
  const dialog = screen.getByRole('dialog', { name: 'Quitar de mi cartera' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar de mi cartera' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Sofía Linares se quitó de tu cartera');
  expect(removeClient).toHaveBeenCalledWith('u1', SOFIA);
});
