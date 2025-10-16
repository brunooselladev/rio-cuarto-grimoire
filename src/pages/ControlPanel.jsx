import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import ControlPanelAdmin from './ControlPanelAdmin.jsx';
import ControlPanelPlayer from './ControlPanelPlayer.jsx';
import { usePOI } from '@/contexts/POIContext.jsx';
import { useToast } from '@/hooks/use-toast.js';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LogIn } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [auth, setAuth] = useState({ username: '', password: '' });
  const { toast } = useToast();

  const submitLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      });
      if (!res.ok) throw new Error('Credenciales inválidas');
      const data = await res.json();
      localStorage.setItem('authToken', data.token);
      toast({ title: 'Sesión iniciada', description: auth.username });
      onLogin(data.token);
    } catch (e) {
      toast({ title: 'Error de login', description: 'Usuario o contraseña inválidos' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 scan-line pointer-events-none z-50" />
        <Card className="w-full max-w-md border-destructive/40 relative z-40">
            <CardHeader>
              <CardTitle className="text-destructive font-mono">Acceso al Panel</CardTitle>
              <CardDescription>Inicia sesión para continuar</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div>
                <Label className="font-mono text-xs">USUARIO</Label>
                <Input value={auth.username} onChange={(e) => setAuth({ ...auth, username: e.target.value })} className="font-mono" />
              </div>
              <div>
                <Label className="font-mono text-xs">CONTRASEÑA</Label>
                <Input type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} className="font-mono" />
              </div>
              <Button className="w-full" onClick={submitLogin}>
                <LogIn className="mr-2" size={16} /> Ingresar
              </Button>
            </CardContent>
        </Card>
    </div>
  );
};

const ControlPanelRouter = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const { refresh } = usePOI();

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (error) {
        console.error("Token inválido:", error);
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      }
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    refresh();
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'admin') {
    return <ControlPanelAdmin user={user} />;
  }

  if (user.role === 'player') {
    return <ControlPanelPlayer user={user} />;
  }

  return <div>Rol no reconocido.</div>;
};

export default ControlPanelRouter;
