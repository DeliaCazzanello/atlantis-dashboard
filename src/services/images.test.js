import { compressImage, fitWithin } from './images';

test('reduce el lado más largo a 1600 px sin deformar y nunca agranda', () => {
  expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});

test('si el navegador no puede leer la foto se sube la original', async () => {
  const file = new File(['x'], 'foto.png', { type: 'image/png' });
  expect(await compressImage(file)).toBe(file); // jsdom no tiene createImageBitmap
});
