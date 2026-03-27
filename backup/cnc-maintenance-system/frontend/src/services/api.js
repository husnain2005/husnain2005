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
  getForMap: () => api.get('/customers/map'),
  geocode: (id) => api.post(`/customers/${id}/geocode`),
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
  resetPassword: (id, newPassword) => api.post(`/auth/users/${id}/reset-password`, { newPassword }),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const auditApi = {
  getLogs: (params) => api.get('/audit', { params }),
  getRecordHistory: (tableName, recordId) => api.get(`/audit/${tableName}/${recordId}`),
};

export const interventionsApi = {
  getAll: (params) => api.get('/interventions', { params }),
  getById: (id) => api.get(`/interventions/${id}`),
  create: (data) => api.post('/interventions', data),
  update: (id, data) => api.put(`/interventions/${id}`, data),
  delete: (id) => api.delete(`/interventions/${id}`),
  complete: (id, data) => api.put(`/interventions/${id}/complete`, data),
  getCalendar: (params) => api.get('/interventions/calendar', { params }),

  // Days
  addDay: (id, data) => api.post(`/interventions/${id}/days`, data),
  updateDay: (id, dayId, data) => api.put(`/interventions/${id}/days/${dayId}`, data),
  deleteDay: (id, dayId) => api.delete(`/interventions/${id}/days/${dayId}`),

  // Materials
  addMaterial: (id, data) => api.post(`/interventions/${id}/materials`, data),
  deleteMaterial: (id, materialId) => api.delete(`/interventions/${id}/materials/${materialId}`),

  // Reports
  addReport: (id, data) => api.post(`/interventions/${id}/reports`, data),

  // Documents
  uploadDocument: (id, file, documentType, description) => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    return api.post(`/interventions/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteDocument: (id, docId) => api.delete(`/interventions/${id}/documents/${docId}`),
};

export default api;
