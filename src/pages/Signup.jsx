import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Loader2 } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/api/v1/auth/register', formData);
      localStorage.setItem('userInfo', JSON.stringify(data)); // Save token
      navigate('/dashboard'); // Go to dashboard
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '1rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#fbbf24' }}>
          <Zap size={40} fill="currentColor" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.1em', marginBottom: '2rem' }}>
          JOIN <span style={{ color: '#fbbf24' }}>INDRA</span>
        </h2>
        
        {error && <div style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" placeholder="Full Name" required 
            style={{ width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '0.5rem', padding: '0.75rem', color: '#fff', outline: 'none' }}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <input 
            type="email" placeholder="Email Address" required 
            style={{ width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '0.5rem', padding: '0.75rem', color: '#fff', outline: 'none' }}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Secure Password" required 
            style={{ width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '0.5rem', padding: '0.75rem', color: '#fff', outline: 'none' }}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          
          <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: '#fbbf24', color: '#000', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none', marginTop: '0.5rem' }}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'INITIALIZE ACCOUNT'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', color: '#737373', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Already mapped? <Link to="/login" style={{ color: '#fbbf24', textDecoration: 'none' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}