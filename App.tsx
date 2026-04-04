import { AppRoutes } from './routes';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
