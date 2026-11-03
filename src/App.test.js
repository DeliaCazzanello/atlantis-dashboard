import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { getSession } from './services/auth';

jest.mock('./supabase/client', () => ({}));
jest.mock('./services/auth', () => ({
  getCachedUser: () => null,
  getSession: jest.fn(),
  logout: jest.fn(),
  onSignOut: () => () => {},
}));

test('sin sesión muestra el inicio de sesión', async () => {
  getSession.mockResolvedValue(null);
  render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
});
