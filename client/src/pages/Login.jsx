import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { api } from '../services/api';
import { validate } from '../utils/validation';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: location.state?.email || '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.login({ ...values, email: values.email.trim().toLowerCase() });
      // Home verifies the cookie with /me rather than trusting the login response.
      navigate('/home', { replace: true });
    } catch (error) {
      setMessage(error.status === 401 ? 'Invalid Credentials' : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="eyebrow">GOOD TO SEE YOU AGAIN</span>
      <h2>Welcome back</h2>
      <p className="muted">Login to your little corner of ShopKart.</p>
      {location.state?.registered && <p className="notice success" role="status">Account created! Login to continue.</p>}
      {message && <p className="notice error" role="alert">{message}</p>}
      <form onSubmit={handleSubmit} noValidate aria-label="Login">
        <fieldset disabled={submitting}>
          <FormField name="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
          <FormField name="password" label="Password" type="password" autoComplete="current-password" value={values.password} onChange={handleChange} error={errors.password} />
          <button className="button button-primary" type="submit">{submitting ? 'Logging in…' : 'Login'}</button>
        </fieldset>
      </form>
      <p className="form-footer">New around here? <Link to="/register">Create an account</Link></p>
      <p className="privacy-note">Your account, securely connected.</p>
    </AuthLayout>
  );
}
