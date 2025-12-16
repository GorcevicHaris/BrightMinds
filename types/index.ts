// User types
export interface User {
    id: number;
    email: string;
    full_name: string;
    role: 'parent' | 'therapist' | 'teacher' | 'admin';
    phone?: string;
    created_at: Date;
}

// Child types
export interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: 'male' | 'female' | 'other';
    profile_image?: string;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface ChildWithRelationship extends Child {
    relationship: 'parent' | 'guardian' | 'therapist' | 'teacher';
    is_primary: boolean;
}

export interface CreateChildDTO {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: 'male' | 'female' | 'other';
    notes?: string;
    profile_image?: string;
}

export interface UpdateChildDTO extends Partial<CreateChildDTO> { }

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}