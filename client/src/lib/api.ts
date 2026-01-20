import axios from 'axios';

// const defaultBaseUrl = '/api'
export const baseURL = import.meta.env.VITE_API_URL;

export function getApiBaseUrl(): string {
  // const configured = import.meta.env.VITE_API_URL
  // if (typeof configured === 'string' && configured.length > 0) {
  //   return configured
  // }

  // return defaultBaseUrl
  return import.meta.env.VITE_API_URL
}

export const apiClient = axios.create({
  baseURL: baseURL,
  // set if using cookies/sessions for auth
  // withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchHello(): Promise<string> {
  const response = await fetch(getApiBaseUrl(), {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`)
  }

  return response.text()
}

export type CreateTripPayload = {
  date: string;
  modeOfTravel: string;
  timeOfDeparture: string;
  destination: string;
};

export async function createTrip(payload: CreateTripPayload) {
  const response = await apiClient.post('/trips', payload);
  return response.data;
}
