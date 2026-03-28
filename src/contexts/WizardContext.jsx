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

  useEffect(() => {
    let cancelled = false;

    const loadWizard = async () => {
      if (cancelled) {
        return;
      }
      await fetchWizard({ showLoading: true });
    };

    const handleAuthChange = () => {
      setViewer(readStoredAuthUser());
      fetchWizard();
    };

    loadWizard();

    const intervalId = window.setInterval(() => {
      fetchWizard();
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
    return String(data?.text || '').trim();
  };

  return (
    <WizardContext.Provider
      value={{
        wizardState,
        loading,
        viewer,
        refreshWizard,
        dismissUrgent,
        triggerSpeak,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
};
