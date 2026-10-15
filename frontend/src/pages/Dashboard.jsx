import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppointments } from '../hooks/useAppointments';

const today = new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useAppointments({ dateFrom: today, dateTo: today, limit: 100, page: 1 });
  const todaysAppointments = data?.data || [];

  const counts = todaysAppointments.reduce(
    (acc, appt) => {
      acc[appt.status] = (acc[appt.status] || 0) + 1;
      return acc;
    },
    { scheduled: 0, arrived: 0, completed: 0, cancelled: 0 }
  );

  return (
    <div>
      <h2>Welcome, {user?.name}</h2>
      <p className="text-muted">
        Role: <span style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</span>
      </p>

      <div className="grid grid-3" style={{ marginTop: 20 }}>
        <SummaryCard label="Scheduled Today" value={counts.scheduled} loading={isLoading} />
        <SummaryCard label="Arrived Today" value={counts.arrived} loading={isLoading} />
        <SummaryCard label="Completed Today" value={counts.completed} loading={isLoading} />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Quick Links</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(user?.role === 'super_admin' || user?.role === 'receptionist') && (
            <Link className="btn btn-outline" to="/scheduler">
              View Scheduler
            </Link>
          )}
          {user?.role === 'receptionist' && (
            <Link className="btn btn-primary" to="/book">
              Book Appointment
            </Link>
          )}
          <Link className="btn btn-outline" to="/appointments">
            View Appointments
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, loading }) {
  return (
    <div className="card">
      <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
        {label}
      </p>
      <p style={{ fontSize: 32, fontWeight: 700, margin: '6px 0 0' }}>{loading ? '-' : value}</p>
    </div>
  );
}
