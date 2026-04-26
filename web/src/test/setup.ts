import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set required environment variables for tests
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Compatibility shim: make jest available as alias for vi
// (for pre-existing test files that use jest.mock, jest.fn, etc.)
(globalThis as any).jest = vi;
