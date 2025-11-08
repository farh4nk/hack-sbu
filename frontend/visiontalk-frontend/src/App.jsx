import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CameraView from './components/CameraView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/camera" element={<CameraView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;