import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api/patient.api';
import FormField from '../common/FormField';

/**
 * Debounces the search term before hitting the API, so typing a name
 * doesn't fire a request per keystroke - this is the "avoid unnecessary
 * database queries" requirement applied on the client side.
 */
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function PatientSearch({ selectedPatient, onSelect }) {
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, 350);

  const { data, isFetching } = useQuery({
    queryKey: ['patients', 'search', debouncedTerm],
    queryFn: () => patientApi.search({ search: debouncedTerm, limit: 8 }).then((res) => res.data),
    enabled: debouncedTerm.length >= 2,
  });

  return (
    <div>
      <FormField label="Search by Patient ID, Mobile Number, or Name" htmlFor="patient-search">
        <input
          id="patient-search"
          placeholder="e.g. PT10234567, 9876543210, or John Doe"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            onSelect(null);
          }}
        />
      </FormField>

      {isFetching && <p className="text-muted">Searching...</p>}

      {!isFetching && debouncedTerm.length >= 2 && (
        <div className="card" style={{ padding: 8, maxHeight: 220, overflowY: 'auto' }}>
          {data && data.length > 0 ? (
            data.map((patient) => (
              <div
                key={patient._id}
                onClick={() => onSelect(patient)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selectedPatient?._id === patient._id ? '#eff6ff' : 'transparent',
                }}
              >
                <strong>{patient.name}</strong> &middot; {patient.mobile} &middot;{' '}
                <span className="text-muted">{patient.patientId}</span>
              </div>
            ))
          ) : (
            <p className="text-muted" style={{ margin: 4 }}>
              No matching patients found.
            </p>
          )}
        </div>
      )}

      {selectedPatient && (
        <div className="alert alert-success">
          Selected: <strong>{selectedPatient.name}</strong> ({selectedPatient.patientId})
        </div>
      )}
    </div>
  );
}
