import {
  extractAuthSession,
  parseStoredAuthSession,
} from '@/utils/authSession';

describe('extractAuthSession', () => {
  const session = {
    user: { id: 'user-1', fullname: 'Ada Student' },
    token: 'token-1',
  };

  it('accepts direct login responses', () => {
    expect(extractAuthSession(session)).toEqual(session);
  });

  it('accepts login responses wrapped in data', () => {
    expect(extractAuthSession({ data: session })).toEqual(session);
  });

  it.each([
    null,
    {},
    { user: session.user },
    { user: null, token: session.token },
    { user: session.user, token: '   ' },
  ])('rejects incomplete responses', response => {
    expect(extractAuthSession(response)).toBeNull();
  });
});

describe('parseStoredAuthSession', () => {
  it('restores a complete serialized session', () => {
    expect(parseStoredAuthSession('{"id":"user-1"}', 'token-1')).toEqual({
      user: { id: 'user-1' },
      token: 'token-1',
    });
  });

  it.each([
    [null, 'token-1'],
    ['{"id":"user-1"}', null],
    ['not-json', 'token-1'],
    ['[]', 'token-1'],
  ])('rejects partial or corrupt stored sessions', (user, token) => {
    expect(parseStoredAuthSession(user, token)).toBeNull();
  });
});
