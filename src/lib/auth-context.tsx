"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "participant";
}

interface AuthContextType {
  user: AuthUser | null;
  role: "admin" | "participant" | null;
  isLoaded: boolean;
  loginAsParticipant: (username: string) => void;
  loginAsAdmin: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoaded: false,
  loginAsParticipant: () => {},
  loginAsAdmin: () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Generate a stable participant ID from username
function generateParticipantId(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `participant-${Math.abs(hash).toString(36)}-${username.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("techbid_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.username && parsed.role) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem("techbid_auth");
    }
    setIsLoaded(true);
  }, []);

  const loginAsParticipant = (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    const authUser: AuthUser = {
      id: generateParticipantId(trimmed),
      username: trimmed,
      role: "participant",
    };
    setUser(authUser);
    localStorage.setItem("techbid_auth", JSON.stringify(authUser));
  };

  const loginAsAdmin = (password: string): boolean => {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
    if (password === adminPassword) {
      const authUser: AuthUser = {
        id: "admin",
        username: "Admin",
        role: "admin",
      };
      setUser(authUser);
      localStorage.setItem("techbid_auth", JSON.stringify(authUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("techbid_auth");
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, isLoaded, loginAsParticipant, loginAsAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
