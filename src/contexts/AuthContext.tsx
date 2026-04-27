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

type LoginAccount = {
  id: string;
  name: string;
  role: User['role'];
  initials: string;
  voiceProfile: VoiceProfileId;
  locale?: string;
  email: string;
  password: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showBiometricWizard, setShowBiometricWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "pathscribe-user";

  const normalizeEnvValue = (value: unknown, fallback = ''): string => {
    const raw = typeof value === 'string' ? value : fallback;
    return raw.trim().replace(/^['"]|['"]$/g, '');
  };

  const normalizeEmail = (value: string): string => value.trim().toLowerCase();

  const getEnv = (key: string, fallback = ''): string => {
    const env = (import.meta.env as Record<string, unknown>)[key];
    return normalizeEnvValue(env, fallback);
  };

  const getLoginAccounts = (): LoginAccount[] => {
    const demoEmail = getEnv('VITE_DEMO_EMAIL', 'demo@pathscribe.ai');
    const demoPass = getEnv('VITE_DEMO_PASS', 'admin123');
    const adminEmail = getEnv('VITE_ADMIN_EMAIL', 'admin@pathscribe.ai');
    const adminPass = getEnv('VITE_ADMIN_PASS', 'admin123');
    const ukEmail = getEnv('VITE_UK_DEMO_EMAIL', 'paul.carter@mft.nhs.uk');
    const ukPass = getEnv('VITE_UK_DEMO_PASS', demoPass);
    const usEmail = getEnv('VITE_US_DEMO_EMAIL', 'amber.fehrs@demo.pathscribe.ai');
    const usPass = getEnv('VITE_US_DEMO_PASS', demoPass);
    const tuthillEmail = getEnv('VITE_TUTHILL_EMAIL', 'mark.tuthill@hfhs-demo.pathscribe.ai');
    const tuthillPass = getEnv('VITE_TUTHILL_PASS', demoPass);

    return [
      {
        id: 'PATH-001',
        name: 'Dr. Sarah Johnson',
        role: 'pathologist',
        initials: 'SJ',
        voiceProfile: 'EN-US',
        email: demoEmail,
        password: demoPass,
      },
      {
        id: 'u3',
        name: 'System Admin',
        role: 'admin',
        initials: 'SA',
        voiceProfile: 'EN-US',
        email: adminEmail,
        password: adminPass,
      },
      {
        id: 'PATH-UK-001',
        name: 'Paul Carter',
        role: 'pathologist',
        initials: 'PC',
        voiceProfile: 'EN-GB',
        locale: 'en-GB',
        email: ukEmail,
        password: ukPass,
      },
      {
        id: 'PATH-UK-002',
        name: 'Dr. Oliver Pemberton',
        role: 'pathologist',
        initials: 'OP',
        voiceProfile: 'EN-GB',
        locale: 'en-GB',
        email: 'oliver.pemberton@mft.nhs.uk',
        password: demoPass,
      },
      {
        id: 'PATH-US-001',
        name: 'Amber Fehrs-Battey',
        role: 'pathologist',
        initials: 'AF',
        voiceProfile: 'EN-US',
        email: usEmail,
        password: usPass,
      },
      {
        id: 'PATH-US-002',
        name: 'Dr. J. Mark Tuthill',
        role: 'pathologist',
        initials: 'MT',
        voiceProfile: 'EN-US',
        email: tuthillEmail,
        password: tuthillPass,
      },
      // Legacy fallback accounts retained for recovery in preview/prod misconfigurations.
      {
        id: 'LEGACY-ADMIN',
        name: 'System Administrator',
        role: 'admin',
        initials: 'SA',
        voiceProfile: 'EN-US',
        email: 'admin@pathscribe.ai',
        password: 'admin123',
      },
      {
        id: 'LEGACY-USER',
        name: 'Standard User',
        role: 'pathologist',
        initials: 'SU',
        voiceProfile: 'EN-US',
        email: 'user@pathscribe.ai',
        password: 'user123',
      },
    ];
  };

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
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = password.trim();
      const account = getLoginAccounts().find((candidate) => {
        return normalizeEmail(candidate.email) === normalizedEmail && candidate.password === normalizedPassword;
      });

      const authenticatedUser: User | null = account
        ? {
            id: account.id,
            name: account.name,
            email: account.email,
            role: account.role,
            initials: account.initials,
            voiceProfile: account.voiceProfile,
            ...(account.locale ? ({ locale: account.locale } as any) : {}),
          }
        : null;

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
