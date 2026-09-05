import { ApiClient, ApiError } from '@/utils/api';
import { getHealthUrl } from '@/config/environment';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

type MockResponseOptions = {
  status?: number;
  statusText?: string;
  body?: string;
  contentType?: string;
  requestId?: string;
};

const createResponse = ({
  status = 200,
  statusText = 'OK',
  body = '',
  contentType = 'application/json',
  requestId,
}: MockResponseOptions = {}): Response => {
  const headers = new Map<string, string>();
  headers.set('content-type', contentType);
  if (requestId) {
    headers.set('x-request-id', requestId);
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
};

describe('ApiClient', () => {
  const fetchMock = jest.fn();
  let consoleLogSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(() => {
    fetchMock.mockReset();
    consoleLogSpy.mockClear();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('parses JSON responses', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({ body: JSON.stringify({ data: { id: '1' } }) })
    );
    const client = new ApiClient('https://example.test/api/v1');

    await expect(client.get('/items')).resolves.toEqual({ data: { id: '1' } });
  });

  it('supports successful empty responses', async () => {
    const response = createResponse({ status: 204, statusText: 'No Content' });
    fetchMock.mockResolvedValueOnce(response);
    const client = new ApiClient('https://example.test/api/v1');
    client.setToken('test-token');

    await expect(client.authDelete('/items/1')).resolves.toBeUndefined();
    expect(response.text).not.toHaveBeenCalled();
  });

  it('returns successful non-JSON response bodies as text', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({ body: 'accepted', contentType: 'text/plain' })
    );
    const client = new ApiClient('https://example.test/api/v1');

    await expect(client.get('/status')).resolves.toBe('accepted');
  });

  it('rejects malformed JSON responses predictably', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ body: '{broken' }));
    const client = new ApiClient('https://example.test/api/v1');

    await expect(client.get('/items')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Invalid response format from server.',
    });
  });

  it('preserves server errors and request IDs', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        body: JSON.stringify({ message: 'Invalid item' }),
        requestId: 'request-123',
      })
    );
    const client = new ApiClient('https://example.test/api/v1');

    const request = client.post('/items', {});
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 422,
      message: 'Invalid item',
      requestId: 'request-123',
    });
  });

  it('rejects authenticated calls locally when no token is set', async () => {
    const client = new ApiClient('https://example.test/api/v1');

    await expect(client.authGet('/private')).rejects.toMatchObject({
      status: 401,
      message: 'Authentication required',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds the bearer token without exposing it through client diagnostics', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ body: '{}' }));
    const client = new ApiClient('https://example.test/api/v1');
    client.setToken('super-secret-token');

    await client.authGet('/private');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v1/private',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer super-secret-token',
        }),
      })
    );
    expect(client.getDebugInfo()).toEqual(
      expect.objectContaining({ hasToken: true })
    );
    expect(JSON.stringify(client.getDebugInfo())).not.toContain(
      'super-secret-token'
    );
    expect(JSON.stringify(consoleLogSpy.mock.calls)).not.toContain(
      'super-secret-token'
    );
  });

  it('invalidates cached GET data after a mutation', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse({ body: '{"version":1}' }))
      .mockResolvedValueOnce(createResponse({ status: 204 }))
      .mockResolvedValueOnce(createResponse({ body: '{"version":2}' }));
    const client = new ApiClient('https://example.test/api/v1');

    await expect(client.get('/items')).resolves.toEqual({ version: 1 });
    await expect(client.get('/items')).resolves.toEqual({ version: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await client.post('/items', { name: 'New item' });
    await expect(client.get('/items')).resolves.toEqual({ version: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('force refresh bypasses and replaces cached data', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse({ body: '{"version":1}' }))
      .mockResolvedValueOnce(createResponse({ body: '{"version":2}' }));
    const client = new ApiClient('https://example.test/api/v1');

    await client.get('/items');
    await expect(client.forceRefresh('/items')).resolves.toEqual({
      version: 2,
    });
    await expect(client.get('/items')).resolves.toEqual({ version: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not let an older in-flight request overwrite refreshed data', async () => {
    let resolveOlderRequest: (response: Response) => void = () => {};
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>(resolve => {
            resolveOlderRequest = resolve;
          })
      )
      .mockResolvedValueOnce(createResponse({ body: '{"version":2}' }));
    const client = new ApiClient('https://example.test/api/v1');

    const olderRequest = client.get<{ version: number }>('/items');
    await expect(client.forceRefresh('/items')).resolves.toEqual({
      version: 2,
    });

    resolveOlderRequest(createResponse({ body: '{"version":1}' }));
    await expect(olderRequest).resolves.toEqual({ version: 1 });
    await expect(client.get('/items')).resolves.toEqual({ version: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts requests that exceed the configured timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );
    const client = new ApiClient('https://example.test/api/v1', 500);

    const request = client.get('/slow');
    jest.advanceTimersByTime(500);

    await expect(request).rejects.toMatchObject({ status: 408 });
  });

  it('uses the API server root for health checks', async () => {
    fetchMock.mockResolvedValueOnce(createResponse());
    const client = new ApiClient('http://localhost:3000/api/v1/');

    await expect(client.testConnection()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('getHealthUrl', () => {
  it.each([
    ['http://localhost:3000/api/v1', 'http://localhost:3000/health'],
    ['http://localhost:3000/api/v1/', 'http://localhost:3000/health'],
    ['http://localhost:3000/api', 'http://localhost:3000/health'],
    ['https://api.example.test', 'https://api.example.test/health'],
  ])('maps %s to %s', (baseUrl, expected) => {
    expect(getHealthUrl(baseUrl)).toBe(expected);
  });
});
