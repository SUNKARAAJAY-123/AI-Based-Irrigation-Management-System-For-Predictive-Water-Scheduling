"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  state?: string;
  district?: string;
  preferred_language: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing token
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setLoading(false);
    }

    const handleUnauthorized = () => {
      logout();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unauthorized", handleUnauthorized);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("unauthorized", handleUnauthorized);
      }
    };
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const profile = await api.get<User>("/users/profile");
      setUser(profile);
      localStorage.setItem("cached_user_profile", JSON.stringify(profile));
    } catch (err) {
      console.error("Failed to load user profile, checking offline cache:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("cached_user_profile");
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {
            logout();
          }
        } else {
          logout();
        }
      } else {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string }>("/users/login", { email, password });
      localStorage.setItem("auth_token", res.access_token);
      setToken(res.access_token);
      
      // Fetch profile with new token
      const profile = await api.get<User>("/users/profile");
      setUser(profile);
      
      const roleLower = profile.role.toLowerCase();
      if (roleLower === "admin" || roleLower === "super_admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      const res = await api.post<{ access_token?: string, success?: boolean, status?: string, message?: string }>("/users/register", userData);
      
      if (res.access_token) {
        localStorage.setItem("auth_token", res.access_token);
        setToken(res.access_token);
        
        // Fetch profile
        const profile = await api.get<User>("/users/profile");
        setUser(profile);
        
        const roleLower = profile.role.toLowerCase();
        if (roleLower === "admin" || roleLower === "super_admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        return { success: true, pending: false };
      } else {
        setToken(null);
        setUser(null);
        setLoading(false);
        return { success: true, pending: true, message: res.message };
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    setLoading(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
