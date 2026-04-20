import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
});

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

export default apiClient;