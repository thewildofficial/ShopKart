export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <aside className="welcome-panel">
        <span className="eyebrow">YOUR EVERYDAY, UPGRADED</span>
        <h1>A little more joy.<br />In every cart.</h1>
        <p>Your next great find starts here. Make yourself at home with a ShopKart account.</p>
        <div className="shopping-art" aria-hidden="true">
          <div className="art-circle" /><div className="bag bag-small">S.</div><div className="bag bag-large">ShopKart.</div>
          <span className="art-spark">✦</span>
        </div>
        <span className="panel-note">One account. All your everyday essentials.</span>
      </aside>
      <section className="form-panel">{children}</section>
    </main>
  );
}
