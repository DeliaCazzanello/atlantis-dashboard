import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// El jsdom de react-scripts 5 no trae TextEncoder y react-router v7 lo necesita.
Object.assign(global, { TextEncoder, TextDecoder });
