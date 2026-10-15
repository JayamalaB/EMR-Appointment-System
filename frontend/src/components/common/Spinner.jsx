export default function Spinner({ label = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}>
      <span className="spinner" aria-hidden="true" />
      <span className="text-muted">{label}</span>
    </div>
  );
}
