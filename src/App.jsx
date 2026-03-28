import { Toaster } from '@/components/ui/toaster.jsx';
import { Toaster as Sonner } from '@/components/ui/sonner.jsx';
import { TooltipProvider } from '@/components/ui/tooltip.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WizardProvider } from '@/contexts/WizardContext.jsx';
import WizardOverlay from '@/components/WizardOverlay.jsx';
import Index from './pages/Index.jsx';
import MapView from './pages/MapView.jsx';
import ControlPanel from './pages/ControlPanel.jsx';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WizardProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <WizardOverlay />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/control" element={<ControlPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WizardProvider>
  </QueryClientProvider>
);

export default App;
