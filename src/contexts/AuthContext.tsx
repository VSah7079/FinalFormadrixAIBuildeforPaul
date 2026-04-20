import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";
import { getBiometricPolicy, getCredentialForUser } from "../services/biometric/mockBiometricService";

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
    return new Promise<boolean>(async (resolve) => {
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
        } else if (email === import.meta.env.VITE_US_DEMO_EMAIL && password === import.meta.env.VITE_US_DEMO_PASS) {
          // US Demo — Amber Fehrs-Battey, MD FCAP — Midwest Pathology Associates
          authenticatedUser = {
            id: "PATH-US-001",
            name: "Amber Fehrs-Battey",
            email: import.meta.env.VITE_US_DEMO_EMAIL,
            role: "pathologist",
            initials: "AF",
            credentials: "MD, FCAP",
            voiceProfile: "EN-US",
          } as any;
        } else if (email === import.meta.env.VITE_TUTHILL_EMAIL && password === import.meta.env.VITE_TUTHILL_PASS) {
          // US Demo — Dr. J. Mark Tuthill — Henry Ford Health System
          authenticatedUser = {
            id: "PATH-US-002",
            name: "Dr. J. Mark Tuthill",
            email: import.meta.env.VITE_TUTHILL_EMAIL,
            role: "pathologist",
            initials: "MT",
            credentials: "MD, FCAP",
            voiceProfile: "EN-US",
          } as any;
        }

        // Show biometric wizard only if:
        // 1. Admin has enabled biometric at institution level (policy.enabled)
        // 2. This user has not yet enrolled a credential
        const shouldShowBiometricWizard = (userId: string): boolean => {
          try {
            const policy = getBiometricPolicy();
            if (!policy.enabled) return false;           // Feature off — never prompt
            const credential = getCredentialForUser(userId);
            return credential === null;                  // No credential = not yet enrolled
          } catch {
            return false;                                // Fail safe — don't block login
          }
        };

        if (authenticatedUser) {
          // Resolve canViewPediatric from the user's role
          try {
            const { mockRoleService } = await import('../services/roles/mockRoleService');
            const rolesRes = await mockRoleService.getAll();
            if (rolesRes.ok) {
              const userRole = rolesRes.data.find((r: any) =>
                r.name.toLowerCase() === (authenticatedUser as any).role?.toLowerCase()
              );
              if (userRole) {
                (authenticatedUser as any).canViewPediatric = (userRole as any).canViewPediatric ?? false;
              }
            }
          } catch { (authenticatedUser as any).canViewPediatric = false; }

          // Resolve credentials from userService
          try {
            const { userService } = await import('../services');
            const usersRes = await userService.getAll();
            if (usersRes.ok) {
              const staffUser = usersRes.data.find((u: any) => u.id === authenticatedUser!.id);
              if (staffUser?.credentials) {
                (authenticatedUser as any).credentials = staffUser.credentials;
              }
            }
          } catch { /* non-critical */ }

          saveUser(authenticatedUser);
          // Check if biometric setup wizard should be shown on first login
          if (shouldShowBiometricWizard(authenticatedUser.id)) {
            setTimeout(() => setShowBiometricWizard(true), 800); // brief delay to let login complete
          }
          resolve(true);
        } else {
          resolve(false);
        }
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
        // Migration: ensure old sessions get a default voice profile
        if (parsed && !parsed.voiceProfile) {
          parsed.voiceProfile = "EN-US";
        }
        // Migration: resolve canViewPediatric and credentials if missing from stored session
        if (parsed && parsed.canViewPediatric === undefined) {
          (async () => {
            try {
              const { mockRoleService } = await import('../services/roles/mockRoleService');
              const rolesRes = await mockRoleService.getAll();
              if (rolesRes.ok) {
                const userRole = rolesRes.data.find((r: any) =>
                  r.name.toLowerCase() === parsed.role?.toLowerCase()
                );
                parsed.canViewPediatric = (userRole as any)?.canViewPediatric ?? false;
              } else {
                parsed.canViewPediatric = false;
              }
            } catch { parsed.canViewPediatric = false; }
            try {
              const { userService } = await import('../services');
              const usersRes = await userService.getAll();
              if (usersRes.ok) {
                const staffUser = usersRes.data.find((u: any) => u.id === parsed.id);
                if (staffUser?.credentials) parsed.credentials = staffUser.credentials;
              }
            } catch { /* non-critical */ }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            setUser({ ...parsed });
          })();
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
