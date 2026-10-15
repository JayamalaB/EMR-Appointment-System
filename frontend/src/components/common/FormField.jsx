/**
 * Thin wrapper that standardizes label + input/select/textarea + validation
 * error rendering, so every form (login, booking, schedule editor) looks
 * and behaves consistently without repeating markup.
 */
export default function FormField({ label, error, children, htmlFor }) {
  return (
    <div className="form-row">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
