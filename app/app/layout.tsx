import type { Metadata } from "next"
import "./globals.css"
import Link from "next/link"

export const metadata: Metadata = {
  title: "AgentOps Monitoring",
  description: "Snowflake Agent & Semantic View monitoring dashboard",
  icons: { icon: "/icon.svg" },
}

function Nav() {
  const links = [
    { href: "/", label: "Overview" },
    { href: "/accuracy", label: "Accuracy" },
    { href: "/quality", label: "Quality" },
    { href: "/cost", label: "Cost" },
    { href: "/alerts", label: "Alerts" },
  ]
  return (
    <nav className="nav">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="nav-link">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <h1 className="header-title">AgentOps Monitoring</h1>
          <Nav />
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  )
}
