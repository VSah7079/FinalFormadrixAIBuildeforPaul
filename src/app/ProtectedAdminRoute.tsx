import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();

  // Not logged in → redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but NOT an admin → redirect
  if (!user.roles.includes("SystemAdmin")) {
    return <Navigate to="/login" replace />;
  }

  // Authorized → allow access
  return children;
}
