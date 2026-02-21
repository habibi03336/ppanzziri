export default function AppShell({ topBar, children, tabBar }) {
  return (
    <div className="app-root">
      <div className="device" role="application" aria-label="3000 생존 대시보드">
        {topBar}
        <main className="content">{children}</main>
        {tabBar}
      </div>
    </div>
  );
}
