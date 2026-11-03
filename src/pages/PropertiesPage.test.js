import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropertiesPage from './PropertiesPage';
import { createProperty, getLocations, getMyProperties, setPropertyActive, updateProperty } from '../services/advisor';
import { registerClient, searchClients } from '../services/clients';

jest.mock('../services/advisor', () => ({
  getMyProperties: jest.fn(),
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
  setPropertyActive: jest.fn(),
  getLocations: jest.fn(),
}));

jest.mock('../services/clients', () => ({
  registerClient: jest.fn(),
  searchClients: jest.fn(),
}));

const OWNER = { id: 'o1', nombre: 'Pedro Ruiz', correo: 'pedro@gmail.com', telefono: null };

const type = (dialog, label, value) => fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });

const HOUSE = {
  id: 7,
  titulo: 'Casa en Unare',
  descripcion: 'Con piscina',
  tipo: 'Casa',
  ubicacion: 'Unare, Puerto Ordaz',
  metros_cuadrados: 200,
  habitaciones: 3,
  baños: 2,
  estatus_legal: 'Documentos en regla',
  propietario: OWNER,
  imagenes: ['/img/house.jpg'],
  foto: '/img/house.jpg',
  inmueble_modalidad: [{ id: 1, tipo_operacion: 'venta', precio: 120000, estado_comercial: 'Disponible' }],
  negociaciones: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  registerClient.mockImplementation(async (owner) => ({ cliente: { id: 'nuevo', ...owner }, yaExistia: false }));
  searchClients.mockResolvedValue([OWNER]);
  getLocations.mockResolvedValue([]);
});

test('registrar inmueble valida, guarda con sus precios y recarga la lista', async () => {
  getMyProperties.mockResolvedValue([]);
  createProperty.mockResolvedValue();
  render(<MemoryRouter><PropertiesPage user={{ id: 'a1' }} /></MemoryRouter>);

  fireEvent.click(await screen.findByRole('button', { name: /Registrar inmueble/ }));
  const dialog = screen.getByRole('dialog', { name: 'Registrar inmueble' });

  fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar inmueble' }));
  expect(within(dialog).getByRole('alert')).toHaveTextContent('título');
  expect(createProperty).not.toHaveBeenCalled();

  type(dialog, 'Título', 'Casa en Unare');
  fireEvent.click(within(dialog).getByLabelText('Venta y alquiler'));
  type(dialog, 'Precio de venta ($)', '120.000');
  type(dialog, 'Precio de alquiler ($/mes)', '700');
  type(dialog, 'Ubicación', 'Unare, Puerto Ordaz');
  type(dialog, 'Metros cuadrados (opcional)', '200.57'); // el punto se escribe como coma decimal
  expect(within(dialog).getByLabelText('Metros cuadrados (opcional)')).toHaveValue('200,57');
  type(dialog, 'Estado del alquiler', 'En negociación');

  // Fotos arrastradas: entran las JPG/PNG/WebP, un PDF no.
  URL.createObjectURL = jest.fn((f) => `blob:${f.name}`);
  URL.revokeObjectURL = jest.fn();
  const photo = new File(['x'], 'sala.jpg', { type: 'image/jpeg' });
  const pdf = new File(['x'], 'plano.pdf', { type: 'application/pdf' });
  fireEvent.drop(within(dialog).getByRole('list', { name: 'Fotos del inmueble' }), { dataTransfer: { files: [photo, pdf] } });
  expect(within(dialog).getByAltText('Foto 1')).toHaveAttribute('src', 'blob:sala.jpg');
  expect(within(dialog).queryByAltText('Foto 2')).toBeNull();
  // Pegar con Ctrl+V desde un campo de texto también la agrega.
  const pasted = new File(['x'], 'cocina.png', { type: 'image/png' });
  fireEvent.paste(within(dialog).getByLabelText('Título'), { clipboardData: { files: [pasted] } });
  expect(within(dialog).getByAltText('Foto 2')).toHaveAttribute('src', 'blob:cocina.png');

  // Sin propietario no se guarda.
  fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar inmueble' }));
  expect(within(dialog).getByRole('alert')).toHaveTextContent('propietario');

  // Propietario nuevo, escrito en el mismo formulario.
  type(dialog, 'Buscar propietario', 'Marta Gil');
  fireEvent.click(within(dialog).getByRole('button', { name: /Registrar nuevo propietario/ }));
  expect(within(dialog).getByLabelText('Nombre del propietario')).toHaveValue('Marta Gil');
  type(dialog, 'Correo del propietario', 'Marta@Gmail.com');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Usar este propietario' }));
  expect(within(dialog).getByText('Nuevo')).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar inmueble' }));

  expect(await screen.findByRole('status')).toHaveTextContent('"Casa en Unare" se registró');
  expect(registerClient).toHaveBeenCalledWith({ nombre: 'Marta Gil', correo: 'marta@gmail.com', telefono: '' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(createProperty).toHaveBeenCalledWith('a1', expect.objectContaining({
    titulo: 'Casa en Unare',
    metros_cuadrados: 200.57,
    habitaciones: null,
    estatus_legal: 'Documentos en regla',
    propietario: { id: 'nuevo', nombre: 'Marta Gil', correo: 'marta@gmail.com', telefono: '' },
    fotos: [photo, pasted],
    modalidades: [
      { tipo_operacion: 'venta', precio: 120000, estado_comercial: 'Disponible' },
      { tipo_operacion: 'alquiler', precio: 700, estado_comercial: 'En negociación' },
    ],
  }));
  expect(getMyProperties).toHaveBeenCalledTimes(2);
});

test('si falla el guardado el modal sigue abierto con el error', async () => {
  getMyProperties.mockResolvedValue([]);
  createProperty.mockRejectedValue({ userMessage: 'No se pudo subir "x.heic".' });
  render(<MemoryRouter><PropertiesPage user={{ id: 'a1' }} /></MemoryRouter>);

  fireEvent.click(await screen.findByRole('button', { name: /Registrar inmueble/ }));
  const dialog = screen.getByRole('dialog');
  type(dialog, 'Título', 'Local');
  type(dialog, 'Precio de venta ($)', '90000');
  type(dialog, 'Ubicación', 'Unare');
  type(dialog, 'Metros cuadrados (opcional)', '80');
  type(dialog, 'Buscar propietario', 'pedro');
  fireEvent.click(await within(dialog).findByRole('button', { name: /Pedro Ruiz/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar inmueble' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('x.heic');
  expect(within(dialog).getByRole('button', { name: 'Registrar inmueble' })).toBeEnabled();
});

test('editar abre el formulario con los datos del inmueble y guarda los cambios', async () => {
  getMyProperties.mockResolvedValue([HOUSE]);
  updateProperty.mockResolvedValue();
  render(<MemoryRouter><PropertiesPage user={{ id: 'a1' }} /></MemoryRouter>);

  fireEvent.click(await screen.findByRole('button', { name: 'Opciones de Casa en Unare' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
  const dialog = screen.getByRole('dialog', { name: 'Editar inmueble' });

  expect(within(dialog).getByLabelText('Título')).toHaveValue('Casa en Unare');
  expect(within(dialog).getByLabelText('Precio de venta ($)')).toHaveValue('120.000');
  expect(within(dialog).getByLabelText('Venta')).toBeChecked();
  expect(within(dialog).getByAltText('Foto 1')).toHaveAttribute('src', '/img/house.jpg');
  expect(within(dialog).getByLabelText('Estatus legal')).toHaveValue('Documentos en regla');
  expect(within(dialog).getByText('Pedro Ruiz')).toBeInTheDocument();

  type(dialog, 'Precio de venta ($)', '110000');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Se guardaron los cambios');
  expect(updateProperty).toHaveBeenCalledWith('a1', HOUSE, expect.objectContaining({
    fotos: ['/img/house.jpg'],
    propietario: expect.objectContaining({ correo: 'pedro@gmail.com' }),
    modalidades: [{ tipo_operacion: 'venta', precio: 110000, estado_comercial: 'Disponible' }],
  }));
});

test('desactivar pide confirmación y un inactivo se puede reactivar sin confirmar', async () => {
  const archived = { ...HOUSE, id: 8, titulo: 'Casa archivada', activo: false };
  getMyProperties.mockResolvedValue([HOUSE, archived]);
  setPropertyActive.mockResolvedValue();
  render(<MemoryRouter><PropertiesPage user={{ id: 'a1' }} /></MemoryRouter>);

  await screen.findByText('Casa archivada');
  expect(screen.getByText('Inactivo', { selector: '.o-badge' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Opciones de Casa en Unare' }));
  expect(screen.queryByRole('menuitem', { name: /Eliminar/ })).toBeNull();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Desactivar' }));
  const dialog = screen.getByRole('dialog', { name: 'Desactivar inmueble' });
  expect(dialog).toHaveTextContent('se conservan');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar inmueble' }));
  expect(await screen.findByRole('status')).toHaveTextContent('"Casa en Unare" se desactivó');
  expect(setPropertyActive).toHaveBeenLastCalledWith(HOUSE, false);

  fireEvent.click(await screen.findByRole('button', { name: 'Opciones de Casa archivada' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Reactivar' }));
  expect(await screen.findByText(/"Casa archivada" está activo de nuevo/)).toBeInTheDocument();
  expect(setPropertyActive).toHaveBeenLastCalledWith(archived, true);
});
