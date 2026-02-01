import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

/**
 * Read a cookie value by name.
 * Used to read the csrf_token cookie set by the backend.
 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Request interceptor to attach CSRF token on state-changing requests
api.interceptors.request.use(
  (config) => {
    const method = (config.method || '').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie expired or invalid - redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API helper functions
export const machinesApi = {
  getAll: (params) => api.get('/machines', { params }),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
  getForMap: () => api.get('/machines/map'),
  getModels: () => api.get('/machines/models'),
  getSizes: (modelId) => api.get(`/machines/models/${modelId}/sizes`),
};

export const issuesApi = {
  getAll: (params) => api.get('/issues', { params }),
  getById: (id) => api.get(`/issues/${id}`),
  create: (data) => api.post('/issues', data),
  update: (id, data) => api.put(`/issues/${id}`, data),
  delete: (id) => api.delete(`/issues/${id}`),
  addComment: (id, comment) => api.post(`/issues/${id}/comments`, { comment }),
  getGroups: () => api.get('/issues/groups'),
  getStats: () => api.get('/issues/stats'),
  uploadAttachments: (id, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post(`/issues/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const pdfApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/pdf/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getImports: (params) => api.get('/pdf/imports', { params }),
  getImport: (id) => api.get(`/pdf/imports/${id}`),
  updateImport: (id, data) => api.put(`/pdf/imports/${id}`, { extracted_data: data }),
  confirmImport: (id, data) => api.post(`/pdf/imports/${id}/confirm`, { data }),
  deleteImport: (id) => api.delete(`/pdf/imports/${id}`),
};

export const usersApi = {
  getAll: () => api.get('/auth/users'),
  create: (data) => api.post('/auth/users', data),
  update: (id, data) => api.put(`/auth/users/${id}`, data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const auditApi = {
  getLogs: (params) => api.get('/audit', { params }),
  getRecordHistory: (tableName, recordId) => api.get(`/audit/${tableName}/${recordId}`),
};

export default api;
