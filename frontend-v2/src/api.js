import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = async (name, email, password, setupSecret) => {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
    setupSecret
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Student APIs
export const seedStudents = async () => {
  const response = await api.post('/students/seed');
  return response.data;
};

export const getStudents = async () => {
  const response = await api.get('/students');
  return response.data;
};

// Room APIs
export const seedRooms = async () => {
  const response = await api.post('/rooms/seed');
  return response.data;
};

export const getRooms = async () => {
  const response = await api.get('/rooms');
  return response.data;
};

// Class APIs
export const seedClasses = async () => {
  const response = await api.post('/classes/seed');
  return response.data;
};

export const getClasses = async () => {
  const response = await api.get('/classes');
  return response.data;
};

// Seating APIs
export const generateSeating = async (examName, examDate, classIds, roomIds) => {
  const response = await api.post('/seating/generate', {
    examName,
    examDate,
    classIds,
    roomIds
  });
  return response.data;
};

export const getLatestSeating = async () => {
  const response = await api.get('/seating/latest');
  return response.data;
};

export const getSeatingById = async (id) => {
  const response = await api.get(`/seating/${id}`);
  return response.data;
};

export const getAllSeatings = async () => {
  const response = await api.get('/seating');
  return response.data;
};

export default api;
