import { Navigate, Outlet } from 'react-router-dom';

interface PrivateRouteProps {
    roles?: string[]; // Nếu cần check role
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ roles }) => {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        // Chưa login => redirect login
        return <Navigate to="/login" replace />;
    }

    if (roles && roles.length > 0 && !roles.includes(user.role)) {
        // Không có role phù hợp => redirect dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />; // Render các child routes
};

export default PrivateRoute;
