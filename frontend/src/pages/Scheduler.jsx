import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctors } from '../hooks/useDoctors';
import { useSlots } from '../hooks/useSlots';
import { useSchedulerSocket } from '../hooks/useSocket';
import SchedulerFilters from '../components/scheduler/SchedulerFilters';
import SlotGrid from '../components/scheduler/SlotGrid';
import Spinner from '../components/common/Spinner';
import ErrorBanner from '../components/common/ErrorBanner';
import { useAuthStore } from '../store/authStore';

const today = new Date().toISOString().slice(0, 10);

export default function Scheduler() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(today);

  const { data: doctors = [] } = useDoctors();
  const { data: slotData, isLoading, isError, error } = useSlots(doctorId, date);

  const selectedDoctor = useMemo(() => doctors.find((d) => d._id === doctorId), [doctors, doctorId]);

  // Live updates: this view is scoped to a single doctor's calendar, so we
  // only subscribe to that doctor's room - see src/hooks/useSocket.js.
  useSchedulerSocket({ doctorId });

  const handleSlotSelect = (slot) => {
    if (slot.isBooked || user?.role === 'doctor') return;
    navigate('/book', { state: { doctorId, departmentId: selectedDoctor?.department?._id, date, slot } });
  };

  return (
    <div>
      <h2>Appointment Scheduler</h2>
      <p className="text-muted">View doctor availability in real time. Updates appear automatically.</p>

      <div className="card">
        <SchedulerFilters
          doctors={doctors}
          doctorId={doctorId}
          date={date}
          onDoctorChange={setDoctorId}
          onDateChange={setDate}
        />

        {!doctorId && <div className="alert alert-info">Select a doctor to view their available slots.</div>}

        {doctorId && isLoading && <Spinner label="Loading slots..." />}
        {doctorId && isError && <ErrorBanner error={error} />}

        {doctorId && slotData && (
          <>
            {slotData.isPastDate && <div className="alert alert-info">This date is in the past.</div>}
            {slotData.isWorkingDay === false && (
              <div className="alert alert-info">The doctor does not work on the selected day.</div>
            )}
            <SlotGrid slots={slotData.slots} onSelect={handleSlotSelect} />
          </>
        )}
      </div>
    </div>
  );
}
