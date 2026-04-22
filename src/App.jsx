import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IndraWebsite from './pages/IndraWebsite';
import IndraWidget from './pages/IndraWidget';
import ChatCore from './components/ChatCore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndraWebsite />} />
        <Route path="/widget" element={<IndraWidget />} />
        <Route path="/chat" element={<ChatCore />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;