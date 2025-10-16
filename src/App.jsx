import { Toaster } from '@/components/ui/toaster.jsx';
import { Toaster as Sonner } from '@/components/ui/sonner.jsx';
import { TooltipProvider } from '@/components/ui/tooltip.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index.jsx';
import MapView from './pages/MapView.jsx';
import ControlPanel from './pages/ControlPanel.jsx';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/control" element={<ControlPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
