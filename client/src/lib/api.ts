import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

// const defaultBaseUrl = '/api'
export const baseURL = import.meta.env.VITE_API_URL;


export const apiClient = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => response.data?.accessToken ?? null)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url ?? '';
    if (
      originalRequest._retry ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/signup')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      localStorage.removeItem('authUser');
      return Promise.reject(error);
    }

    localStorage.setItem('accessToken', newToken);
    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;

    return apiClient(originalRequest);
  },
);

export type CreateTripPayload = {
  destination: string;
  tripDateTime: string;
  returnTripDateTime: string;
  mode: ModeType;
  returnMode?: ModeType;
};

export async function createTrip(payload: CreateTripPayload) {
  const response = await apiClient.post('/trips', payload);
  return response.data;
}

export type ModeType = "LAND" | "AIR" | "SEA";
export type TripStatus = "PENDING" | "APPROVED" | "REJECTED";

export type UserTrip = {
  id: string;
  destination: string;
  tripDateTime: string;
  returnTripDateTime: string;
  mode: ModeType;
  returnMode?: ModeType | null;
  status: TripStatus;
  rejectionReason?: string | null;
};

export type AdminTrip = {
  id: string;
  destination: string;
  tripDateTime: string;
  returnTripDateTime: string;
  mode: ModeType;
  returnMode?: ModeType | null;
  status: TripStatus;
  rejectionReason?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export async function fetchTrips(params?: {
  status?: TripStatus;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const response = await apiClient.get(`/trips?${search.toString()}`);
  return response.data as UserTrip[];
}

export async function fetchAdminTrips(params?: {
  status?: TripStatus;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const response = await apiClient.get(`/admin/trips?${search.toString()}`);
  return response.data as AdminTrip[];
}

export async function approveTrip(id: string) {
  const response = await apiClient.patch(`/admin/trips/${id}/approve`);
  return response.data as AdminTrip;
}

export async function rejectTrip(id: string, reason: string) {
  const response = await apiClient.patch(`/admin/trips/${id}/reject`, { reason });
  return response.data as AdminTrip;
}

export type UserNotification = {
  id: string;
  tripId: string;
  type: "TRIP_APPROVED" | "TRIP_REJECTED";
  message: string;
  reason?: string | null;
  readAt?: string | null;
  createdAt: string;
  trip: {
    id: string;
    destination: string;
    tripDateTime: string;
    returnTripDateTime: string;
    mode: ModeType;
    returnMode?: ModeType | null;
    status: TripStatus;
    rejectionReason?: string | null;
  };
};

export async function fetchUserNotifications(params?: {
  page?: number;
  limit?: number;
  unread?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.unread) search.set("unread", "true");
  const response = await apiClient.get(`/notifications?${search.toString()}`);
  return response.data as UserNotification[];
}

export async function markNotificationRead(id: string) {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data as UserNotification;
}

export async function fetchTrip(id: string) {
  const response = await apiClient.get(`/trips/${id}`);
  return response.data as {
    id: string;
    destination: string;
    tripDateTime: string;
    returnTripDateTime: string;
    mode: ModeType;
    returnMode?: ModeType | null;
    status: TripStatus;
    rejectionReason?: string | null;
  };
}

export async function resubmitTrip(id: string, payload: Partial<CreateTripPayload>) {
  const response = await apiClient.patch(`/trips/${id}/resubmit`, payload);
  return response.data;
}
