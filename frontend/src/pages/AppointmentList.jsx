import { useMemo, useState } from 'react';
import { useAppointments, useCancelAppointment, useMarkArrived } from '../hooks/useAppointments';
import { useDoctors } from '../hooks/useDoctors';
import { useAuthStore } from '../store/authStore';
import AppointmentTable from '../components/appointments/AppointmentTable';
import Pagination from '../components/common/Pagination';
import Spinner from '../components/common/Spinner';
import ErrorBanner from '../components/common/ErrorBanner';
import FormField from '../components/common/FormField';

const STATUS_OPTIONS = ['scheduled', 'arrived', 'completed', 'cancelled'];

export default function AppointmentList() {
  const user = useAuthStore((s) => s.user);
  const { data: doctors = [] } = useDoctors();

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    doctor: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // Debounce the free-text search so every keystroke doesn't hit the API -
  // same pattern used in PatientSearch, applied here to the server-side
  // filter query.
  const [searchInput, setSearchInput] = useState('');

  const effectiveFilters = useMemo(() => {
    const cleaned = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    return cleaned;
  }, [filters]);

  const { data, isLoading, isError, error, isFetching } = useAppointments(effectiveFilters);
  const cancelMutation = useCancelAppointment();
  const arriveMutation = useMarkArrived();

  const canManage = user?.role === 'super_admin' || user?.role === 'receptionist';

  const updateFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilter({ search: searchInput });
  };

  const handleCancel = (id) => {
    const reason = window.prompt('Reason for cancellation (optional):') || '';
    cancelMutation.mutate({ id, cancelReason: reason });
  };

  return (
    <div>
      <h2>Appointments</h2>

      <div className="card">
        <form onSubmit={handleSearchSubmit} className="filters-bar">
          <FormField label="Search (patient / mobile)" htmlFor="search">
            <input
              id="search"
              placeholder="Name or mobile number"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </FormField>

          {user?.role !== 'doctor' && (
            <FormField label="Doctor" htmlFor="doctorFilter">
              <select id="doctorFilter" value={filters.doctor} onChange={(e) => updateFilter({ doctor: e.target.value })}>
                <option value="">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Status" htmlFor="statusFilter">
            <select id="statusFilter" value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="From" htmlFor="dateFrom">
            <input id="dateFrom" type="date" value={filters.dateFrom} onChange={(e) => updateFilter({ dateFrom: e.target.value })} />
          </FormField>

          <FormField label="To" htmlFor="dateTo">
            <input id="dateTo" type="date" value={filters.dateTo} onChange={(e) => updateFilter({ dateTo: e.target.value })} />
          </FormField>

          <button type="submit" className="btn btn-primary btn-sm">
            Apply
          </button>
        </form>

        {isLoading && <Spinner label="Loading appointments..." />}
        {isError && <ErrorBanner error={error} />}

        {data && (
          <>
            {isFetching && <p className="text-muted" style={{ fontSize: 12 }}>Refreshing...</p>}
            <AppointmentTable
              appointments={data.data}
              canManage={canManage}
              onArrive={(id) => arriveMutation.mutate(id)}
              onCancel={handleCancel}
            />
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
