export default function AppShell({ children, floatingNav }) {
  return (
    <div className="app-root">
      <div className="device" role="application" aria-label="3000 생존 대시보드">
        <main className="content">{children}</main>
        {floatingNav}
      </div>
    </div>
  );
}
