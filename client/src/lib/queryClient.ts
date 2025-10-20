import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../context/auth-provider";

// Centralized Axios instance for all API requests
const apiBaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL)
  ? (import.meta as any).env.VITE_API_URL
  : 'http://localhost:5001';

export const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
});

// Add token to all requests if present
axiosInstance.interceptors.request.use((config: any) => {
  const { getToken } = useAuth(); // Dynamically fetch the token
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Default query function for react-query using Axios
const axiosQueryFn = async <T>({ queryKey }: QueryFunctionContext): Promise<T> => {
  // queryKey is an array, join with / for REST endpoints
  const url = Array.isArray(queryKey) ? queryKey.join("/") : String(queryKey);
  const response = await axiosInstance.get<T>(url);
  return response.data;
};


// Generic API request function using Axios
export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config: object = {}
): Promise<T> {
  const response = await axiosInstance.request<T>({
    method,
    url,
    data,
    ...config,
  });
  return response.data;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: axiosQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
