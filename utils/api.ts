import { Child, CreateChildDTO, UpdateChildDTO, ApiResponse } from '@/types';

const API_BASE_URL = '/api';

// Helper za fetch sa token-om
async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Greška pri zahtjevu');
    }

    return response.json();
}

// Children API
export const childrenApi = {
    // Dobavi svu decu
    getAll: async (): Promise<ApiResponse<Child[]>> => {
        return fetchWithAuth('/auth/children');
    },

    // Dobavi jedno dete
    getById: async (id: number): Promise<ApiResponse<Child>> => {
        return fetchWithAuth(`/auth/children/${id}`);
    },

    // Dodaj dete
    create: async (data: CreateChildDTO): Promise<ApiResponse<Child>> => {
        return fetchWithAuth('/auth/children', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Ažuriraj dete
    update: async (id: number, data: UpdateChildDTO): Promise<ApiResponse> => {
        return fetchWithAuth(`/auth/children/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Obriši dete
    delete: async (id: number): Promise<ApiResponse> => {
        return fetchWithAuth(`/auth/children/${id}`, {
            method: 'DELETE',
        });
    },
};