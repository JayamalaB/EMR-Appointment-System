import { memo } from 'react';
import StatusBadge from './StatusBadge';
import Button from '../common/Button';

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const AppointmentRow = memo(function AppointmentRow({ appointment, canManage, onArrive, onCancel }) {
  const canArrive = canManage && appointment.status === 'scheduled';
  const canCancel = canManage && ['scheduled', 'arrived'].includes(appointment.status);

  return (
    <tr>
      <td>{appointment.patient?.name}</td>
      <td>{appointment.patient?.mobile}</td>
      <td>{appointment.doctor?.name}</td>
      <td>{appointment.department?.name}</td>
      <td>{formatDateTime(appointment.slotStart)}</td>
      <td>
        <StatusBadge status={appointment.status} />
      </td>
      {canManage && (
        <td>
          {canArrive && (
            <Button size="sm" variant="outline" onClick={() => onArrive(appointment._id)}>
              Mark Arrived
            </Button>
          )}{' '}
          {canCancel && (
            <Button size="sm" variant="danger" onClick={() => onCancel(appointment._id)}>
              Cancel
            </Button>
          )}
        </td>
      )}
    </tr>
  );
});

function AppointmentTable({ appointments, canManage, onArrive, onCancel }) {
  if (!appointments || appointments.length === 0) {
    return <div className="empty-state">No appointments found for the selected filters.</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Patient</th>
          <th>Mobile</th>
          <th>Doctor</th>
          <th>Department</th>
          <th>Slot</th>
          <th>Status</th>
          {canManage && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {appointments.map((appt) => (
          <AppointmentRow
            key={appt._id}
            appointment={appt}
            canManage={canManage}
            onArrive={onArrive}
            onCancel={onCancel}
          />
        ))}
      </tbody>
    </table>
  );
}

export default memo(AppointmentTable);
