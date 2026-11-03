import { fireEvent, render, screen } from '@testing-library/react';
import CommissionsPage from './CommissionsPage';
import { getMyDeals } from '../services/advisor';

jest.mock('../services/advisor', () => ({ getMyDeals: jest.fn() }));

const ym = (monthsAgo) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

test('el selector de periodo filtra indicadores y desglose', async () => {
  const thisMonth = ym(0);
  getMyDeals.mockResolvedValue([
    { id: 1, fecha: `${thisMonth}-01`, comision: 5000, porcentaje: 5, precioFinal: 100000, operacion: 'venta', inmueble: { titulo: 'Casa del mes' } },
    { id: 2, fecha: '1999-01-10', comision: 999, porcentaje: 3, precioFinal: 33300, operacion: 'venta', inmueble: { titulo: 'Casa vieja' } },
    { id: 3, fecha: null, comision: 0, porcentaje: 4, precioFinal: 0, operacion: 'alquiler', inmueble: { titulo: 'En curso' } },
  ]);
  render(<CommissionsPage user={{ id: 'u1' }} />);

  // Por defecto, todo el año en curso: la de 1999 y la abierta no cuentan como cerradas del periodo.
  expect(await screen.findByText('Casa del mes')).toBeInTheDocument();
  expect(screen.queryByText('Casa vieja')).toBeNull();
  expect(screen.getAllByText('$5.000').length).toBeGreaterThan(0);

  fireEvent.change(screen.getByLabelText('Periodo'), { target: { value: thisMonth } });
  expect(screen.getByText('Casa del mes')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: `Todo ${thisMonth.slice(0, 4)}` })).toBeInTheDocument();
});
