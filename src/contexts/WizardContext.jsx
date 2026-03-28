import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_WIZARD_STATE,
  getWizardHeaders,
  normalizeWizardState,
  readStoredAuthUser,
} from '@/lib/wizard.js';

const WizardContext = createContext(null);

export const useWizard = () => {
  const context = useContext(WizardContext);

  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }

  return context;
};

export const WizardProvider = ({ children }) => {
  const [wizardState, setWizardState] = useState(DEFAULT_WIZARD_STATE);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(() => readStoredAuthUser());
  const [avatarState, setAvatarState] = useState(null);

  const fetchWizard = async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/wizard', {
        headers: getWizardHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wizard state (${response.status})`);
      }

      const data = await response.json();
      setViewer(readStoredAuthUser());
      setWizardState(normalizeWizardState(data));
      return data;
    } catch (error) {
      console.error('Error fetching wizard state:', error);
      setViewer(readStoredAuthUser());
      setWizardState(DEFAULT_WIZARD_STATE);
      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchAvatar = async () => {
    const user = readStoredAuthUser();
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/avatars/${user.id}`, { headers: getWizardHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setAvatarState(data);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadWizard = async () => {
      if (cancelled) {
        return;
      }
      await fetchWizard({ showLoading: true });
      await fetchAvatar();
    };

    const handleAuthChange = () => {
      setViewer(readStoredAuthUser());
      fetchWizard();
      fetchAvatar();
    };

    loadWizard();

    const intervalId = window.setInterval(() => {
      fetchWizard();
      fetchAvatar();
    }, 5000);

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-token-changed', handleAuthChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-token-changed', handleAuthChange);
    };
  }, []);

  const refreshWizard = async () => {
    await fetchWizard();
  };

  const dismissUrgent = async () => {
    const response = await fetch('/api/wizard/dismiss', {
      method: 'POST',
      headers: getWizardHeaders({ includeJson: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to dismiss urgent wizard message (${response.status})`);
    }

    const data = await response.json();
    setViewer(readStoredAuthUser());
    setWizardState(normalizeWizardState(data));
    return data;
  };

  const triggerSpeak = async ({ message = '', history = [] } = {}) => {
    const response = await fetch('/api/wizard/speak', {
      method: 'POST',
      headers: getWizardHeaders({ includeJson: true }),
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger wizard speech (${response.status})`);
    }

    const data = await response.json();
    // Return object so callers can access puzzleSolved if needed
    return { text: String(data?.text || '').trim(), puzzleSolved: Boolean(data?.puzzleSolved) };
  };

  const triggerAvatarSpeak = async ({ message = '', history = [] } = {}) => {
    const user = readStoredAuthUser();
    if (!user?.id) throw new Error('Not authenticated');
    const response = await fetch(`/api/avatars/${user.id}/speak`, {
      method: 'POST',
      headers: getWizardHeaders({ includeJson: true }),
      body: JSON.stringify({ message, history }),
    });
    if (!response.ok) throw new Error(`Avatar speak failed (${response.status})`);
    const data = await response.json();
    return String(data?.text || '').trim();
  };

  const dismissAvatar = async (userId) => {
    await fetch(`/api/avatars/${userId}/dismiss`, {
      method: 'POST',
      headers: getWizardHeaders({ includeJson: true }),
    });
    await fetchAvatar();
  };

  return (
    <WizardContext.Provider
      value={{
        wizardState,
        loading,
        viewer,
        avatarState,
        refreshWizard,
        dismissUrgent,
        triggerSpeak,
        triggerAvatarSpeak,
        dismissAvatar,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
};
