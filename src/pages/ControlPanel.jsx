import { useState } from 'react';
import ControlPanelAdmin from './ControlPanelAdmin.jsx';
import ControlPanelPlayer from './ControlPanelPlayer.jsx';
import { usePOI } from '@/contexts/POIContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/hooks/use-toast.js';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [auth, setAuth] = useState({ username: '', password: '' });
  const { login } = useAuth();
  const { toast } = useToast();
  const { refresh } = usePOI();

  const submitLogin = async () => {
    try {
      await login(auth.username, auth.password);
      toast({ title: 'SesiÃ³n iniciada', description: auth.username });
      refresh();
    } catch (_error) {
      toast({ title: 'Error de login', description: 'Usuario o contraseÃ±a invÃ¡lidos' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 scan-line pointer-events-none z-50" />
      <Card className="w-full max-w-md border-destructive/40 relative z-40">
        <CardHeader>
          <CardTitle className="text-destructive font-mono">Acceso al Panel</CardTitle>
          <CardDescription>Inicia sesiÃ³n para continuar</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div>
            <Label className="font-mono text-xs">USUARIO</Label>
            <Input
              value={auth.username}
              onChange={(e) => setAuth({ ...auth, username: e.target.value })}
              className="font-mono"
            />
          </div>
          <div>
            <Label className="font-mono text-xs">CONTRASEÃ‘A</Label>
            <Input
              type="password"
              value={auth.password}
              onChange={(e) => setAuth({ ...auth, password: e.target.value })}
              className="font-mono"
            />
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
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">Verificando sesiÃ³n...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === 'admin') {
    return <ControlPanelAdmin user={user} onLogout={logout} />;
  }

  if (user.role === 'player') {
    return <ControlPanelPlayer user={user} onLogout={logout} />;
  }

  return <div>Rol no reconocido.</div>;
};

export default ControlPanelRouter;
