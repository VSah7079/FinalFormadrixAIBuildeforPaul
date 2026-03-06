import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "***REMOVED***";
  initials: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "pathscribe-user";

  const login = async (email: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let authenticatedUser: User | null = null;

        if (email === "***REMOVED***@pathscribe.ai" && password === "***REMOVED***") {
          authenticatedUser = {
            id: "1",
            name: "Dr. Sarah Johnson",
            email: "***REMOVED***@pathscribe.ai",
            role: "pathologist",
            initials: "SJ",
          };
        } else if (email === "***REMOVED***@pathscribe.ai" && password === "***REMOVED***") {
          authenticatedUser = {
            id: "2",
            name: "System Admin",
            email: "***REMOVED***@pathscribe.ai",
            role: "***REMOVED***",
            initials: "SA",
          };
        }

        if (authenticatedUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
          setUser(authenticatedUser);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  // Load session on initial mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  // Keep React state synced with localStorage on every render
  // This prevents Back/Forward from restoring stale authenticated UI
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored && user !== null) {
      setUser(null);
    }
  });

  const isAuthenticated = Boolean(localStorage.getItem(STORAGE_KEY));

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}