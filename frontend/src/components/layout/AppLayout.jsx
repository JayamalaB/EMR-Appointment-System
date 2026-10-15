import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLogout } from '../../hooks/useAuth';
import Button from '../common/Button';

const NAV_ITEMS = {
  super_admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/scheduler', label: 'Scheduler' },
    { to: '/appointments', label: 'Appointments' },
  ],
  receptionist: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/scheduler', label: 'Scheduler' },
    { to: '/book', label: 'Book Appointment' },
    { to: '/appointments', label: 'Appointments' },
  ],
  doctor: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/appointments', label: 'My Appointments' },
  ],
};

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const items = NAV_ITEMS[user?.role] || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>EMR Appointments</h1>
        <nav>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="user-info">
            {user?.name} &middot; <span style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</span>
          </div>
          <Button variant="outline" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>
            Logout
          </Button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
