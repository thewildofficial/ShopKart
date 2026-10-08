export default function FormField({ name, label, value, onChange, error, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name} name={name} value={value} onChange={onChange}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}
        {...inputProps}
      />
      {error && <p className="field-error" id={`${name}-error`}>{error}</p>}
    </div>
  );
}
