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
  headers?: Record<string, string>;
};

const createResponse = ({
  status = 200,
  statusText = 'OK',
  body = '',
  contentType = 'application/json',
  requestId,
  headers: extraHeaders = {},
}: MockResponseOptions = {}): Response => {
  const headers = new Map<string, string>();
  headers.set('content-type', contentType);
  if (requestId) {
    headers.set('x-request-id', requestId);
  }
  Object.entries(extraHeaders).forEach(([name, value]) => {
    headers.set(name.toLowerCase(), value);
  });

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

  it.each(['get', 'authGet', 'forceRefresh'] as const)(
    'invalidates rejected credentials through %s',
    async method => {
      fetchMock.mockResolvedValueOnce(
        createResponse({ status: 401, body: '{}' })
      );
      const client = new ApiClient('https://example.test');
      const invalidated = jest.fn();
      client.setToken('expired');
      client.setSessionInvalidationHandler(invalidated);
      await expect(client[method]('/private')).rejects.toMatchObject({
        status: 401,
      });
      expect(invalidated).toHaveBeenCalledTimes(1);
      await expect(client.authGet('/another')).rejects.toMatchObject({
        status: 401,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it('does not invalidate a newer session after an old request fails', async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const client = new ApiClient('https://example.test');
    const invalidated = jest.fn();
    client.setSessionInvalidationHandler(invalidated);
    client.setToken('old');
    const request = client.authGet('/private');
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });
    client.setToken('new');
    finish(createResponse({ status: 401, body: '{}' }));
    await rejected;
    expect(invalidated).not.toHaveBeenCalled();
    expect(client.getDebugInfo()).toMatchObject({ hasToken: true });
  });

  it.each([403, 500])('does not expire a session for HTTP %s', async status => {
    fetchMock.mockResolvedValue(createResponse({ status, body: '{}' }));
    const client = new ApiClient('https://example.test');
    const invalidated = jest.fn();
    client.setToken('valid');
    client.setSessionInvalidationHandler(invalidated);
    await expect(client.authGet('/private')).rejects.toMatchObject({ status });
    expect(invalidated).not.toHaveBeenCalled();
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

  describe('429 rate limit errors', () => {
    const rateLimited = (options: MockResponseOptions = {}) =>
      createResponse({
        status: 429,
        statusText: 'Too Many Requests',
        ...options,
      });

    it('uses retryAfter from the JSON body', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({
          body: JSON.stringify({
            status: 429,
            message: 'Too many attempts. Try again in 42 seconds.',
            retryAfter: 42,
          }),
        })
      );
      const client = new ApiClient('https://example.test/api/v1');

      const request = client.post('/auth/login', {});
      await expect(request).rejects.toBeInstanceOf(ApiError);
      await expect(request).rejects.toMatchObject({
        status: 429,
        retryAfterSeconds: 42,
        message: 'Too many attempts. Try again in 42 seconds.',
      });
    });

    it('prefers the body over the Retry-After header', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({
          body: JSON.stringify({ status: 429, retryAfter: 42 }),
          headers: { 'Retry-After': '7' },
        })
      );
      const client = new ApiClient('https://example.test/api/v1');

      await expect(client.post('/auth/login', {})).rejects.toMatchObject({
        retryAfterSeconds: 42,
      });
    });

    it('falls back to the Retry-After header', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({
          body: JSON.stringify({ status: 429, message: 'Slow down' }),
          headers: { 'Retry-After': '7' },
        })
      );
      const client = new ApiClient('https://example.test/api/v1');

      await expect(client.post('/auth/login', {})).rejects.toMatchObject({
        status: 429,
        retryAfterSeconds: 7,
        message: 'Too many attempts. Try again in 7 seconds.',
      });
    });

    it('reads the header when the body is plain text', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({
          body: 'Too many requests, please try again later.',
          contentType: 'text/html; charset=utf-8',
          headers: { 'Retry-After': '900' },
        })
      );
      const client = new ApiClient('https://example.test/api/v1');

      await expect(client.get('/courses', false)).rejects.toMatchObject({
        status: 429,
        retryAfterSeconds: 900,
        message: 'Too many attempts. Try again in 900 seconds.',
      });
    });

    it('uses the singular for 1 second', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({ body: JSON.stringify({ status: 429, retryAfter: 1 }) })
      );
      const client = new ApiClient('https://example.test/api/v1');

      await expect(client.post('/auth/login', {})).rejects.toMatchObject({
        retryAfterSeconds: 1,
        message: 'Too many attempts. Try again in 1 second.',
      });
    });

    it('keeps the generic message when no retry value is given', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({ body: JSON.stringify({ status: 429 }) })
      );
      const client = new ApiClient('https://example.test/api/v1');

      const request = client.post('/auth/login', {});
      await expect(request).rejects.toMatchObject({
        status: 429,
        message: 'Rate limit reached. Please wait a moment and try again.',
      });
      const error = (await request.catch((e: unknown) => e)) as ApiError;
      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it.each([
      ['zero', { retryAfter: 0 }, undefined],
      ['negative', { retryAfter: -5 }, undefined],
      ['fractional', { retryAfter: 2.5 }, undefined],
      ['string', { retryAfter: '42' }, undefined],
      ['HTTP-date header', {}, 'Wed, 21 Oct 2026 07:28:00 GMT'],
    ])('ignores a %s retry value', async (_label, body, retryAfterHeader) => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({
          body: JSON.stringify({ status: 429, ...body }),
          headers: retryAfterHeader ? { 'Retry-After': retryAfterHeader } : {},
        })
      );
      const client = new ApiClient('https://example.test/api/v1');

      const error = (await client
        .post('/auth/login', {})
        .catch((e: unknown) => e)) as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(429);
      expect(error.retryAfterSeconds).toBeUndefined();
      expect(error.message).toBe(
        'Rate limit reached. Please wait a moment and try again.'
      );
    });

    it('stays a 429 when the body is malformed JSON', async () => {
      fetchMock.mockResolvedValueOnce(
        rateLimited({ body: '{not json', headers: { 'Retry-After': '3' } })
      );
      const client = new ApiClient('https://example.test/api/v1');

      await expect(client.post('/auth/login', {})).rejects.toMatchObject({
        status: 429,
        retryAfterSeconds: 3,
      });
    });

    it('keeps existing ApiError callers working without the 4th argument', () => {
      const error = new ApiError('Nope', 400, 'req-1');
      expect(error.retryAfterSeconds).toBeUndefined();
      expect(error.requestId).toBe('req-1');
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
