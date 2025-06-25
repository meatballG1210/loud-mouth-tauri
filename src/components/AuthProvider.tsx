import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequestJson, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  // Verify token with server
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;

      setIsLoading(true);
      try {
        const data = await apiRequestJson({
          url: "/api/auth/me",
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch (error) {
        // Token is invalid, clear auth state
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!token) return;

      return apiRequestJson({
        url: "/api/auth/logout",
        method: "POST",
      });
    },
    onSettled: () => {
      // Clear auth state regardless of success/failure
      setUser(null);
      setToken(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      queryClient.clear();
    },
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!token,
    isLoading: isLoading && !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
