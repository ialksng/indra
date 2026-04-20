import { HashRouter, Routes, Route } from 'react-router-dom';
import IndraWebsite from './pages/IndraWebsite';
import IndraWidget from './pages/IndraWidget';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<IndraWebsite />} />
        <Route path="/widget" element={<IndraWidget />} />
      </Routes>
    </HashRouter>
  );
}