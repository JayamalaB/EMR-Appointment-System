import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoctors } from '../hooks/useDoctors';
import { useSlots } from '../hooks/useSlots';
import { useCreateAppointment } from '../hooks/useAppointments';
import SchedulerFilters from '../components/scheduler/SchedulerFilters';
import SlotGrid from '../components/scheduler/SlotGrid';
import PatientSearch from '../components/appointments/PatientSearch';
import FormField from '../components/common/FormField';
import Button from '../components/common/Button';
import ErrorBanner from '../components/common/ErrorBanner';
import Spinner from '../components/common/Spinner';

const today = new Date().toISOString().slice(0, 10);

// name/mobile are intentionally optional here: this single form backs both
// "Existing Patient" and "New Patient" modes, and the name/mobile inputs
// are only rendered (and therefore only registered with react-hook-form)
// in "New Patient" mode. If they were required unconditionally, submitting
// in "Existing Patient" mode would fail validation on fields the user
// never sees - which is exactly what blocked the Confirm button before.
// Their presence is validated manually in onSubmit, gated on patientMode.
const bookingFormSchema = z.object({
  name: z.string().optional(),
  mobile: z.string().max(15, 'Mobile number is too long').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  purpose: z.string().max(500).optional(),
});

export default function BookAppointment() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state || {};

  const [doctorId, setDoctorId] = useState(prefill.doctorId || '');
  const [date, setDate] = useState(prefill.date || today);
  const [selectedSlot, setSelectedSlot] = useState(prefill.slot || null);

  const [patientMode, setPatientMode] = useState('existing'); // 'existing' | 'new'
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: doctors = [] } = useDoctors();
  const { data: slotData, isLoading: slotsLoading } = useSlots(doctorId, date);
  const selectedDoctor = useMemo(() => doctors.find((d) => d._id === doctorId), [doctors, doctorId]);

  const createAppointment = useCreateAppointment();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(bookingFormSchema) });

  const handleDoctorChange = (id) => {
    setDoctorId(id);
    setSelectedSlot(null);
  };
  const handleDateChange = (d) => {
    setDate(d);
    setSelectedSlot(null);
  };

  const onSubmit = (formValues) => {
    if (!doctorId || !selectedDoctor) return;
    if (!selectedSlot) return;

    const payload = {
      doctor: doctorId,
      department: selectedDoctor.department._id,
      slotStart: selectedSlot.start,
      purpose: formValues.purpose || '',
    };

    if (patientMode === 'existing') {
      if (!selectedPatient) return;
      payload.patientId = selectedPatient._id;
    } else {
      // Manual validation (see bookingFormSchema comment above): only
      // enforced in "new patient" mode, where these fields actually exist.
      let hasError = false;
      if (!formValues.name || formValues.name.trim().length < 2) {
        setError('name', { message: 'Name must be at least 2 characters' });
        hasError = true;
      }
      if (!formValues.mobile || formValues.mobile.trim().length < 7) {
        setError('mobile', { message: 'Enter a valid mobile number' });
        hasError = true;
      }
      if (hasError) return;

      payload.newPatient = {
        name: formValues.name,
        mobile: formValues.mobile,
        gender: formValues.gender,
        address: formValues.address,
      };
    }

    createAppointment.mutate(payload, {
      onSuccess: () => navigate('/appointments'),
    });
  };

  const canSubmit =
    doctorId && selectedSlot && (patientMode === 'existing' ? Boolean(selectedPatient) : true);

  return (
    <div>
      <h2>Book Appointment</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="card">
          <h3>1. Choose Doctor &amp; Slot</h3>
          <SchedulerFilters
            doctors={doctors}
            doctorId={doctorId}
            date={date}
            onDoctorChange={handleDoctorChange}
            onDateChange={handleDateChange}
          />

          {doctorId && slotsLoading && <Spinner label="Loading slots..." />}
          {doctorId && slotData && (
            <SlotGrid
              slots={slotData.slots}
              selected={selectedSlot?.startTime}
              onSelect={(slot) => !slot.isBooked && setSelectedSlot(slot)}
            />
          )}
          {selectedSlot && (
            <div className="alert alert-info" style={{ marginTop: 12 }}>
              Selected slot: <strong>{date} at {selectedSlot.startTime}</strong>
            </div>
          )}
        </div>

        <div className="card">
          <h3>2. Patient</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button
              type="button"
              variant={patientMode === 'existing' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPatientMode('existing')}
            >
              Existing Patient
            </Button>
            <Button
              type="button"
              variant={patientMode === 'new' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPatientMode('new')}
            >
              New Patient
            </Button>
          </div>

          {patientMode === 'existing' ? (
            <PatientSearch selectedPatient={selectedPatient} onSelect={setSelectedPatient} />
          ) : (
            <div className="grid grid-2">
              <FormField label="Full Name" htmlFor="name" error={errors.name?.message}>
                <input id="name" {...register('name')} />
              </FormField>
              <FormField label="Mobile Number" htmlFor="mobile" error={errors.mobile?.message}>
                <input id="mobile" {...register('mobile')} />
              </FormField>
              <FormField label="Gender" htmlFor="gender">
                <select id="gender" {...register('gender')}>
                  <option value="other">Other</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </FormField>
              <FormField label="Address" htmlFor="address">
                <input id="address" {...register('address')} />
              </FormField>
            </div>
          )}
        </div>

        <div className="card">
          <h3>3. Visit Details</h3>
          <FormField label="Purpose of Visit" htmlFor="purpose">
            <textarea id="purpose" rows={3} {...register('purpose')} />
          </FormField>

          {createAppointment.isError && <ErrorBanner error={createAppointment.error} />}

          <Button type="submit" variant="primary" loading={createAppointment.isPending} disabled={!canSubmit}>
            Confirm Booking
          </Button>
        </div>
      </form>
    </div>
  );
}
