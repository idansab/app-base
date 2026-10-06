import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const ProtectedRoute = ({ unauthenticatedElement }) => {
  const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (unauthenticatedElement) {
      return unauthenticatedElement;
    }
    navigateToLogin();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
