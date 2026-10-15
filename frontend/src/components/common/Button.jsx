export default function Button({
  children,
  variant = 'primary',
  size,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  ...rest
}) {
  const classNames = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
