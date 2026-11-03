import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LocationField from './LocationField';
import { getLocations } from '../services/advisor';

jest.mock('../services/advisor', () => ({ getLocations: jest.fn() }));

function Harness() {
  const [value, setValue] = useState('');
  return <LocationField id="loc" value={value} onChange={setValue} />;
}

test('sugiere ubicaciones sin importar tildes ni mayúsculas y unifica lo escrito', async () => {
  getLocations.mockResolvedValue(['Las Peonías, Puerto Ordaz', 'Las Peonías, Puerto Ordaz', 'Las peonias, Puerto Ordaz']);
  render(<Harness />);
  const input = screen.getByRole('combobox', { name: 'Ubicación' });

  // Se escribe sin tildes: aparece una sola opción, con la escritura más usada.
  fireEvent.change(input, { target: { value: 'peonia' } });
  expect(await screen.findByRole('option', { name: 'Las Peonías, Puerto Ordaz' })).toBeInTheDocument();
  expect(screen.getAllByRole('option')).toHaveLength(1);

  // Con el teclado: flecha abajo y Enter la eligen.
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toHaveValue('Las Peonías, Puerto Ordaz');
  expect(screen.queryByRole('listbox')).toBeNull();

  // Escrita completa con otra forma: al salir del campo queda la registrada.
  fireEvent.change(input, { target: { value: 'las  PEONIAS, puerto ordaz' } });
  fireEvent.blur(input);
  expect(input).toHaveValue('Las Peonías, Puerto Ordaz');

  // Una ubicación nueva se respeta tal cual.
  fireEvent.change(input, { target: { value: 'Los Olivos' } });
  fireEvent.blur(input);
  expect(input).toHaveValue('Los Olivos');
});
