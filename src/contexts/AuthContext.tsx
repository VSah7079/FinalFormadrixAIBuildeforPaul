import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";

// 1. Defined the User with the new linguistic property
export interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "***REMOVED***";
  initials: string;
  voiceProfile: VoiceProfileId; // Required to ensure the VoiceProvider always has a value
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void; // New: update state without logout
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "formedrix-user";

  // Helper to sync state and storage
  const saveUser = (userData: User | null) => {
    if (userData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(userData);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let authenticatedUser: User | null = null;

        // Mock Login Data with Voice Profiles
        if (email === "***REMOVED***@formedrix.ai" && password === "***REMOVED***") {
          authenticatedUser = {
            id: "u1",
            name: "Dr. Sarah Johnson",
            email: "***REMOVED***@formedrix.ai",
            role: "pathologist",
            initials: "SJ",
            voiceProfile: "EN-US",
          };
        } else if (email === "***REMOVED***@formedrix.ai" && password === "***REMOVED***") {
          authenticatedUser = {
            id: "u3",
            name: "System Admin",
            email: "***REMOVED***@formedrix.ai",
            role: "***REMOVED***",
            initials: "SA",
            voiceProfile: "EN-US",
          };
        }

        if (authenticatedUser) {
          saveUser(authenticatedUser);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => saveUser(null);

  // Allow the UI (like StaffModal) to push updates to the current session
  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      saveUser(updatedUser);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migration check: ensure old sessions get a default profile
        if (parsed && !parsed.voiceProfile) {
          parsed.voiceProfile = "EN-US";
        }
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
