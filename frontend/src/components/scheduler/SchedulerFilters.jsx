import { memo } from 'react';
import FormField from '../common/FormField';

function SchedulerFilters({ doctors, doctorId, date, onDoctorChange, onDateChange }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="filters-bar">
      <FormField label="Doctor" htmlFor="doctor-filter">
        <select id="doctor-filter" value={doctorId} onChange={(e) => onDoctorChange(e.target.value)}>
          <option value="">Select a doctor</option>
          {doctors.map((doc) => (
            <option key={doc._id} value={doc._id}>
              {doc.name} &middot; {doc.department?.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Date" htmlFor="date-filter">
        <input
          id="date-filter"
          type="date"
          min={today}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </FormField>
    </div>
  );
}

export default memo(SchedulerFilters);
