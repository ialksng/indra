import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
});

// REQUEST INTERCEPTOR: Attach Token
apiClient.interceptors.request.use((config) => {
    const userInfo = localStorage.getItem('userInfo'); 
    
    if (userInfo && userInfo !== "undefined") {
        try {
            const parsed = JSON.parse(userInfo);
            if (parsed && parsed.token) {
                config.headers.Authorization = `Bearer ${parsed.token}`;
            }
        } catch (e) {
            console.error("[Indra] Token parsing failed:", e);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// RESPONSE INTERCEPTOR: Handle Expired Tokens globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("[Indra] Unauthorized or token expired. Clearing local session.");
      localStorage.removeItem('userInfo');
      // Uncomment the line below if you want it to forcefully kick them to login
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default apiClient;