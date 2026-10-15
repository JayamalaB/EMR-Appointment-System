/** Normalizes the many shapes an error can arrive in (axios error, API envelope, plain string). */
export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.message || (typeof error === 'string' ? error : fallback);
}

export default function ErrorBanner({ error, fallback }) {
  if (!error) return null;
  return <div className="alert alert-error">{extractErrorMessage(error, fallback)}</div>;
}
