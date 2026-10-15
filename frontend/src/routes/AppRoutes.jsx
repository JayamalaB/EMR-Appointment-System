import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Scheduler from '../pages/Scheduler';
import BookAppointment from '../pages/BookAppointment';
import AppointmentList from '../pages/AppointmentList';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointments" element={<AppointmentList />} />

          <Route element={<ProtectedRoute roles={['super_admin', 'receptionist']} />}>
            <Route path="/scheduler" element={<Scheduler />} />
          </Route>

          <Route element={<ProtectedRoute roles={['super_admin', 'receptionist']} />}>
            <Route path="/book" element={<BookAppointment />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
