import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PropertiesPage from './PropertiesPage';
import PropertyDetailPage from './PropertyDetailPage';
import { getLocations, getMyProperties, getMyProperty, setPropertyActive } from '../services/advisor';
import { getMyProfile } from '../services/users';

jest.mock('../services/advisor', () => ({
  getMyProperties: jest.fn(),
  getMyProperty: jest.fn(),
  getLocations: jest.fn(),
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
  setPropertyActive: jest.fn(),
}));
jest.mock('../services/clients', () => ({ registerClient: jest.fn(), searchClients: jest.fn() }));
jest.mock('../services/users', () => ({ getMyProfile: jest.fn() }));

const USER = { id: 'a1', name: 'Liobel Henríquez' };
const HOUSE = {
  id: 7,
  titulo: 'Casa en Unare',
  descripcion: 'Con piscina y jardín.',
  tipo: 'Casa',
  ubicacion: 'Unare, Puerto Ordaz',
  metros_cuadrados: 200.5,
  habitaciones: 3,
  baños: null,
  estatus_legal: 'Documentos en regla',
  activo: true,
  propietario: { id: 'o1', nombre: 'Pedro Ruiz', correo: 'pedro@gmail.com', telefono: null },
  imagenes: ['/a.jpg', '/b.jpg'],
  foto: '/a.jpg',
  inmueble_modalidad: [{ id: 1, tipo_operacion: 'alquiler', precio: 700, estado_comercial: 'Disponible' }],
};

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inmuebles" element={<PropertiesPage user={USER} />} />
        <Route path="/inmuebles/:id" element={<PropertyDetailPage user={USER} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getMyProperties.mockResolvedValue([HOUSE]);
  getMyProperty.mockResolvedValue(HOUSE);
  getLocations.mockResolvedValue([]);
  getMyProfile.mockResolvedValue({ name: 'Liobel Henríquez', email: 'liobel@atlantis.com', phone: null, whatsapp: 'https://wa.me/584140000000' });
});

test('la tarjeta lleva al detalle con descripción, características, precios, asesor y propietario', async () => {
  renderApp('/inmuebles');
  fireEvent.click(await screen.findByRole('link', { name: 'Casa en Unare' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'Casa en Unare' })).toBeInTheDocument();
  expect(getMyProperty).toHaveBeenCalledWith('a1', '7');
  expect(screen.getByText('Con piscina y jardín.')).toBeInTheDocument();
  expect(screen.getByText('200,5 m²')).toBeInTheDocument();
  expect(screen.queryByText('Baños')).toBeNull(); // sin dato, no se muestra
  expect(screen.getByRole('region', { name: 'Precios' })).toHaveTextContent('$700/mes');

  const advisor = screen.getByRole('region', { name: 'Asesor a cargo' });
  expect(within(advisor).getByText('Liobel Henríquez')).toBeInTheDocument();
  expect(within(advisor).getByRole('link', { name: 'Escribir por WhatsApp' })).toHaveAttribute('href', 'https://wa.me/584140000000');
  expect(screen.getByRole('link', { name: 'pedro@gmail.com' })).toBeInTheDocument();

  // Galería: la miniatura cambia la foto grande.
  fireEvent.click(screen.getByRole('button', { name: 'Ver foto 2' }));
  expect(screen.getByAltText('Casa en Unare, foto 2 de 2')).toHaveAttribute('src', '/b.jpg');

  // Volver regresa a la lista.
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  expect(await screen.findByRole('heading', { level: 1, name: /Mis inmuebles/ })).toBeInTheDocument();
});

test('desde el detalle se edita y se desactiva, y recarga el inmueble', async () => {
  setPropertyActive.mockResolvedValue();
  renderApp('/inmuebles/7');

  fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
  expect(screen.getByRole('dialog', { name: 'Editar inmueble' })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

  fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
  const dialog = screen.getByRole('dialog', { name: 'Desactivar inmueble' });
  getMyProperty.mockResolvedValue({ ...HOUSE, activo: false });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar inmueble' }));

  expect(await screen.findByRole('status')).toHaveTextContent('se desactivó');
  expect(setPropertyActive).toHaveBeenCalledWith(HOUSE, false);
  expect(await screen.findByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  expect(screen.getByText(/está inactivo/)).toBeInTheDocument();
});

test('un inmueble que no es del asesor muestra un aviso', async () => {
  getMyProperty.mockResolvedValue(null);
  renderApp('/inmuebles/99');
  expect(await screen.findByText(/no existe o no está en tu cartera/)).toBeInTheDocument();
});
