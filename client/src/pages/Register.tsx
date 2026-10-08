import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { FormErrors } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { api, errorMessage } from '../services/api';
import { validate } from '../utils/validation';

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const fieldErrors = validate(values, true);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.register({ ...values, email: values.email.trim().toLowerCase() });
      // Registration creates an account; login is a separate, explicit step.
      navigate('/login', { replace: true, state: { registered: true, email: values.email.trim() } });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="eyebrow">JOIN THE EVERYDAY GOOD</span>
      <h2>Create your account</h2>
      <p className="muted">A few details, and you’re on your way.</p>
      {message && <p className="notice error" role="alert">{message}</p>}
      <form onSubmit={handleSubmit} noValidate aria-label="Create account">
        <fieldset disabled={submitting}>
          <FormField name="fullName" label="Full name" autoComplete="name" value={values.fullName} onChange={handleChange} error={errors.fullName} />
          <FormField name="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
          <FormField name="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={values.password} onChange={handleChange} error={errors.password} />
          <FormField name="phone" label="Phone number" type="tel" autoComplete="tel" value={values.phone} onChange={handleChange} error={errors.phone} />
          <button className="button button-primary" type="submit">{submitting ? 'Creating account…' : 'Create account'}</button>
        </fieldset>
      </form>
      <p className="form-footer">Already part of ShopKart? <Link to="/login">Login</Link></p>
    </AuthLayout>
  );
}
