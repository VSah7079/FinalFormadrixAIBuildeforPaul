import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";
import { getBiometricPolicy, getCredentialForUser } from "../services/biometric/mockBiometricService";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "admin";
  initials: string;
  voiceProfile: VoiceProfileId;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  loading: boolean;
  showBiometricWizard: boolean;
  setShowBiometricWizard: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showBiometricWizard, setShowBiometricWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "pathscribe-user";

  const saveUser = (userData: User | null) => {
    if (userData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(userData);
  };

  const shouldShowBiometricWizard = (userId: string): boolean => {
    try {
      const policy = getBiometricPolicy();
      if (!policy.enabled) return false;
      const credential = getCredentialForUser(userId);
      return credential === null;
    } catch {
      return false;
    }
  };

  // Resolve extra fields from userService (canViewPediatric, credentials)
  // Option C: canViewPediatric lives on the StaffUser record, not the role
  const resolveStaffFields = async (userId: string): Promise<{ canViewPediatric: boolean; credentials?: string }> => {
    try {
      const { userService } = await import('../services');
      const res = await userService.getAll();
      if (res.ok) {
        const staffUser = res.data.find((u: any) => u.id === userId);
        if (staffUser) {
          return {
            canViewPediatric: staffUser.canViewPediatric ?? false,
            credentials: staffUser.credentials ?? undefined,
          };
        }
      }
    } catch { /* non-critical — fail safe */ }
    return { canViewPediatric: false };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      let authenticatedUser: User | null = null;

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
        authenticatedUser = {
          id: "PATH-UK-002",
          name: "Dr. Oliver Pemberton",
          email: "oliver.pemberton@mft.nhs.uk",
          role: undefined,
          initials: "OP",
          voiceProfile: "EN-GB",
          locale: "en-GB",
        } as any;
      } else if (email === import.meta.env.VITE_US_DEMO_EMAIL && password === import.meta.env.VITE_US_DEMO_PASS) {
        authenticatedUser = {
          id: "PATH-US-001",
          name: "Amber Fehrs-Battey",
          email: import.meta.env.VITE_US_DEMO_EMAIL,
          role: "pathologist",
          initials: "AF",
          voiceProfile: "EN-US",
        } as any;
      } else if (email === import.meta.env.VITE_TUTHILL_EMAIL && password === import.meta.env.VITE_TUTHILL_PASS) {
        authenticatedUser = {
          id: "PATH-US-002",
          name: "Dr. J. Mark Tuthill",
          email: import.meta.env.VITE_TUTHILL_EMAIL,
          role: "pathologist",
          initials: "MT",
          voiceProfile: "EN-US",
        } as any;
      }

      if (!authenticatedUser) return false;

      // Resolve canViewPediatric and credentials from StaffUser record (Option C)
      const staffFields = await resolveStaffFields(authenticatedUser.id);
      Object.assign(authenticatedUser, staffFields);

      saveUser(authenticatedUser);

      if (shouldShowBiometricWizard(authenticatedUser.id)) {
        setTimeout(() => setShowBiometricWizard(true), 800);
      }

      return true;
    } catch (e) {
      console.error("Login error:", e);
      return false;
    }
  };

  const logout = () => saveUser(null);

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
        if (parsed && !parsed.voiceProfile) {
          parsed.voiceProfile = "EN-US";
        }
        // If canViewPediatric missing from stored session, resolve from userService
        if (parsed && parsed.canViewPediatric === undefined) {
          resolveStaffFields(parsed.id).then(fields => {
            Object.assign(parsed, fields);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            setUser({ ...parsed });
          });
        } else {
          setUser(parsed);
        }
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
        showBiometricWizard,
        setShowBiometricWizard,
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
