import type { InputHTMLAttributes, ChangeEventHandler } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange'> {
  name: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  error?: string;
}
export default function FormField({ name, label, value, onChange, error, ...inputProps }: Props) {
  return <div className="field">
    <label htmlFor={name}>{label}</label>
    <input id={name} name={name} value={value} onChange={onChange}
      aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...inputProps} />
    {error && <p className="field-error" id={`${name}-error`}>{error}</p>}
  </div>;
}
