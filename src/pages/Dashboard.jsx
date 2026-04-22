import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mic, LogOut } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if user is logged in locally
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      navigate('/login');
      return;
    }

    // 2. Fetch fresh user telemetry from your backend
    apiClient.get('/api/v1/auth/me')
      .then((res) => {
        setUserData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem('userInfo');
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const handleUpgrade = async (planType) => {
    try {
      // Create the order on your backend
      const { data } = await apiClient.post('/api/v1/payments/create-subscription', { planType });
      
      // Open Razorpay
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Indra AI",
        description: `Upgrade to ${planType.toUpperCase()}`,
        theme: { color: "#fbbf24" },
        handler: async function (response) {
          // Verify on backend after payment
          await apiClient.post('/api/v1/payments/verify', { ...response, planType });
          window.location.reload(); 
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment trigger failed", error);
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#fbbf24' }}><Zap className="animate-pulse" size={40}/></div>;

  // Set limits based on the user's plan returned from the DB
  const { name, email, subscription, usage } = userData;
  const tokenLimit = subscription.plan === 'lite' ? 5000 : subscription.plan === 'smart' ? 50000 : 'Unlimited';
  const voiceLimit = subscription.plan === 'lite' ? 5 : subscription.plan === 'smart' ? 60 : 'Unlimited';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #262626', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.1em', margin: 0 }}>INDRA <span style={{ color: '#fbbf24' }}>NEXUS</span></h1>
            <p style={{ color: '#737373', margin: '0.5rem 0 0 0' }}>{name} ({email})</p>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={16}/> Disconnect
          </button>
        </div>

        {/* Current Plan Banner */}
        <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '1rem', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', color: '#a3a3a3', margin: 0 }}>Active Protocol</h2>
            <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.5rem 0 0 0' }}>
              {subscription.plan}
            </p>
          </div>
          {subscription.plan !== 'ultra' && (
            <button 
              onClick={() => handleUpgrade('ultra')}
              style={{ backgroundColor: '#fbbf24', color: '#000', fontWeight: 'bold', padding: '1rem 2rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Zap size={20} fill="currentColor" /> UNLOCK ULTRA
            </button>
          )}
        </div>

        {/* Usage Telemetry */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={20} color="#fbbf24"/> Compute Tokens</h3>
              <span style={{ color: '#737373', fontFamily: 'monospace' }}>{usage.tokensUsed} / {tokenLimit}</span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#0a0a0a', borderRadius: '999px', height: '0.75rem', border: '1px solid #262626', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#fbbf24', height: '100%', width: tokenLimit === 'Unlimited' ? '100%' : `${Math.min((usage.tokensUsed / tokenLimit) * 100, 100)}%`, transition: 'width 1s ease' }}></div>
            </div>
          </div>

          <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mic size={20} color="#fbbf24"/> Neural Voice</h3>
              <span style={{ color: '#737373', fontFamily: 'monospace' }}>{usage.voiceMinutesUsed} / {voiceLimit} min</span>
            </div>
             <div style={{ width: '100%', backgroundColor: '#0a0a0a', borderRadius: '999px', height: '0.75rem', border: '1px solid #262626', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#fbbf24', height: '100%', width: voiceLimit === 'Unlimited' ? '100%' : `${Math.min((usage.voiceMinutesUsed / voiceLimit) * 100, 100)}%`, transition: 'width 1s ease' }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}