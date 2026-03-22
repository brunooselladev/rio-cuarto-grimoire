import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { authFetch } = useAuth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async ({ title, content }) => {
    try {
      const response = await authFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) throw new Error('Failed to add event');
      await fetchEvents();
      toast({ title: 'Evento Publicado' });
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const deleteEvent = async (id) => {
    try {
      const response = await authFetch(`/api/events/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete event');
      setEvents(prev => prev.filter(e => e._id !== id));
      toast({ title: 'Evento Eliminado' });
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  return { events, loading, addEvent, deleteEvent };
};
