import { Link } from 'react-router-dom';
import type { Customer } from '../types';
export default function Home({ customer }: { customer: Customer }) {
  return (
    <main className="home-layout">
      <section className="home-welcome">
        <span className="eyebrow">YOUR SHOPKART ACCOUNT</span>
        <h1>Welcome, {customer.fullName}!</h1>
        <p>You’re all signed in. It’s good to have you here.</p>
        <Link className="button button-primary browse-link" to="/products">Browse products →</Link>
      </section>
      <section className="profile-card" aria-labelledby="profile-heading">
        <div className="profile-heading"><span className="avatar" aria-hidden="true">{customer.fullName.charAt(0).toUpperCase()}</span><div><h2 id="profile-heading">Your details</h2><p className="muted">Your account at a glance.</p></div></div>
        <dl>
          <div><dt>Full name</dt><dd>{customer.fullName}</dd></div>
          <div><dt>Email</dt><dd>{customer.email}</dd></div>
          <div><dt>Phone number</dt><dd>{customer.phone}</dd></div>
        </dl>
        <p className="profile-note">You can safely return to this page while you’re signed in.</p>
      </section>
    </main>
  );
}
