import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";

// 1. Defined the User with the new linguistic property
export interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "admin";
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

  const STORAGE_KEY = "pathscribe-user";

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
        if (email === import.meta.env.VITE_DEMO_EMAIL && password === import.meta.env.VITE_DEMO_PASS) {
          authenticatedUser = {
            id: "PATH-001",
            name: "Dr. Sarah Johnson",
            email: import.meta.env.VITE_DEMO_EMAIL,
            role: "pathologist",
            initials: "SJ",
            voiceProfile: "EN-US",
          };
        } else if (email === import.meta.env.VITE_ADMIN_EMAIL && password === import.meta.env.VITE_ADMIN_PASS) {
          authenticatedUser = {
            id: "u3",
            name: "System Admin",
            email: import.meta.env.VITE_ADMIN_EMAIL,
            role: "admin",
            initials: "SA",
            voiceProfile: "EN-US",
          };
        } else if (email === import.meta.env.VITE_UK_DEMO_EMAIL && password === import.meta.env.VITE_UK_DEMO_PASS) {
          authenticatedUser = {
            id: "PATH-UK-001",
            name: "Paul Carter",
            email: import.meta.env.VITE_UK_DEMO_EMAIL,
            role: "pathologist",
            initials: "PC",
            voiceProfile: "EN-GB",
            locale: "en-GB",
          } as any;
        } else if (email === "oliver.pemberton@mft.nhs.uk" && password === import.meta.env.VITE_DEMO_PASS) {
          // UK Demo — Dr. Oliver Pemberton, no role assigned (security testing)
          authenticatedUser = {
            id: "PATH-UK-002",
            name: "Dr. Oliver Pemberton",
            email: "oliver.pemberton@mft.nhs.uk",
            role: undefined,
            initials: "OP",
            voiceProfile: "EN-GB",
            locale: "en-GB",
          } as any;
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
