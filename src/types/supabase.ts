// Supabase user profile types
export interface UserProfile {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
}

export interface UpdatePasswordData {
  password: string;
}

export interface ProfileUpdateResponse {
  error: Error | null;
}