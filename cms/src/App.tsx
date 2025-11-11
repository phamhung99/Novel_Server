import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/dashboard/users" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />}>
                    <Route path="users" element={<UsersPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
