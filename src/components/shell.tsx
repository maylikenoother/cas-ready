import Link from "next/link";

export function AppShell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
}) {
  return (
    <div className="shell">
      <header className="shell-bar">
        <div className="shell-bar-inner">
        <Link className="brand" href="/home">CAS Ready</Link>
        <Link href="/settings">Account</Link>
        <nav className="shell-nav" aria-label="Account">
            <Link href="/home">Home</Link>
            <Link href="/interview/new">Practise</Link>
            <Link href="/prep">Prep</Link>
            <Link href="/history">History</Link>
            <Link href="/settings">{name || "Account"}</Link>
            {role === "admin" ? <Link href="/admin">Admin</Link> : null}
            {role === "university" || role === "agent" ? <Link href="/org">Organisation</Link> : null}
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <nav className="bottom-nav" aria-label="Mobile">
        <Link href="/home">Home</Link>
        <Link href="/interview/new">Practise</Link>
        <Link href="/prep">Prep</Link>
        <Link href="/history">History</Link>
      </nav>
    </div>
  );
}
