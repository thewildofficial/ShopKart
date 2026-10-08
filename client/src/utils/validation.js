// Return one friendly message per field so errors appear beside their inputs.
export function validate(values, registering = false) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';

  if (!values.password.trim()) errors.password = 'Enter your password.';
  else if (registering && values.password.length < 6) errors.password = 'Use at least 6 characters.';

  if (registering) {
    if (!values.fullName.trim()) errors.fullName = 'Enter your full name.';
    if (!values.phone.trim()) errors.phone = 'Enter your phone number.';
    else if (!/^\+?[\d\s()-]{7,20}$/.test(values.phone.trim()) || values.phone.replace(/\D/g, '').length < 7) {
      errors.phone = 'Enter a valid phone number (7–15 digits).';
    } else if (values.phone.replace(/\D/g, '').length > 15) {
      errors.phone = 'Enter a valid phone number (7–15 digits).';
    }
  }
  return errors;
}
