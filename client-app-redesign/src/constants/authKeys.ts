export const AUTH_STORAGE_KEYS = {
  token:        'token',
  refreshToken: 'refreshToken',
  username:     'username',
  role:         'role',
  userId:       'userId',
} as const;

export const AUTH_EVENTS = {
  unauthorized: 'auth-unauthorized',
} as const;

export const MFR_SEEN_KEY_PREFIX = 'seen_mfr_';
