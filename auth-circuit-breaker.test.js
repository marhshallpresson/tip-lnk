// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {};

const localStorageMock = {
  getItem: vi.fn((key) => mockStorage[key] || null),
  setItem: vi.fn((key, value) => { mockStorage[key] = value.toString(); }),
  removeItem: vi.fn((key) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { for(let key in mockStorage) delete mockStorage[key]; })
};

// Make the functions non-enumerable so Object.keys(localStorage) ignores them
Object.defineProperty(localStorageMock, 'getItem', { enumerable: false });
Object.defineProperty(localStorageMock, 'setItem', { enumerable: false });
Object.defineProperty(localStorageMock, 'removeItem', { enumerable: false });
Object.defineProperty(localStorageMock, 'clear', { enumerable: false });

const proxyStorage = new Proxy(localStorageMock, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return mockStorage[prop] || null;
  },
  set(target, prop, value) {
    mockStorage[prop] = value;
    return true;
  },
  ownKeys(target) {
    return Object.keys(mockStorage);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop in mockStorage) {
      return { enumerable: true, configurable: true, value: mockStorage[prop] };
    }
    return undefined;
  }
});

vi.stubGlobal('localStorage', proxyStorage);

// Mock the react hooks so we can import AuthContext safely
vi.mock('react', () => ({
  createContext: vi.fn(),
  useContext: vi.fn(),
  useState: vi.fn(),
  useEffect: vi.fn(),
  useCallback: vi.fn(),
}));

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(),
}));

// We only need the standalone function
const { purgeStaleDynamicSession } = await import('./src/contexts/AuthContext.jsx');

describe('AuthContext stale session purge', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('purges session with null token on mount', () => {
    const key = 'dynamic_3fbb3eed-6109-4669-8081-ed7e44415f8c_session';
    localStorage.setItem(key, JSON.stringify({
      value: { token: null, sessionExpiration: Date.now() + 100000 }
    }));
    purgeStaleDynamicSession();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('purges session with expired timestamp on mount', () => {
    const key = 'dynamic_3fbb3eed-6109-4669-8081-ed7e44415f8c_session';
    localStorage.setItem(key, JSON.stringify({
      value: { token: 'valid-token', sessionExpiration: Date.now() - 1000 }
    }));
    purgeStaleDynamicSession();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('does NOT purge a valid live session', () => {
    const key = 'dynamic_3fbb3eed-6109-4669-8081-ed7e44415f8c_session';
    localStorage.setItem(key, JSON.stringify({
      value: { token: 'valid-jwt', sessionExpiration: Date.now() + 3600000 }
    }));
    purgeStaleDynamicSession();
    expect(localStorage.getItem(key)).not.toBeNull();
  });
});
