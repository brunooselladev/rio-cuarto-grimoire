import { jwtDecode } from 'jwt-decode';

export const WIZARD_LOCATIONS = ['map', 'panel', 'character', 'events'];
export const WIZARD_MODES = ['topics', 'examples', 'full_prompt'];

export const DEFAULT_WIZARD_STATE = {
  urgentMessage: {
    active: false,
    text: '',
    dismissedBy: [],
  },
  hidden: {
    active: false,
    location: 'map',
    mode: 'topics',
    topics: [],
    examplePhrases: [],
    systemPrompt: '',
    rulesContext: '',
    lore: '',
  },
  notes: [],
  computed: {
    urgentMessage: {
      dismissed: false,
    },
  },
};

export function normalizeWizardState(payload) {
  return {
    ...DEFAULT_WIZARD_STATE,
    ...(payload || {}),
    urgentMessage: {
      ...DEFAULT_WIZARD_STATE.urgentMessage,
      ...(payload?.urgentMessage || {}),
      dismissedBy: Array.isArray(payload?.urgentMessage?.dismissedBy)
        ? payload.urgentMessage.dismissedBy
        : [],
    },
    hidden: {
      ...DEFAULT_WIZARD_STATE.hidden,
      ...(payload?.hidden || {}),
      topics: Array.isArray(payload?.hidden?.topics) ? payload.hidden.topics : [],
      examplePhrases: Array.isArray(payload?.hidden?.examplePhrases) ? payload.hidden.examplePhrases : [],
      rulesContext: payload?.hidden?.rulesContext || '',
      lore: payload?.hidden?.lore || '',
    },
    notes: Array.isArray(payload?.notes) ? payload.notes : [],
    computed: {
      urgentMessage: {
        dismissed: Boolean(payload?.computed?.urgentMessage?.dismissed),
      },
    },
  };
}

export function readStoredAuthUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = window.localStorage.getItem('authToken');
  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode(token);
    return {
      id: decoded.id,
      username: decoded.username || decoded.sub || '',
      role: decoded.role,
    };
  } catch (_error) {
    return null;
  }
}

export function getWizardHeaders({ includeJson = false } = {}) {
  const headers = {};
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function parseWizardLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinWizardLines(lines) {
  return Array.isArray(lines) ? lines.join('\n') : '';
}

export function emitAuthTokenChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-token-changed'));
  }
}
