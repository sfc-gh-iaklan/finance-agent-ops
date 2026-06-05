"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function AgentFilter({ agents }: { agents: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const current = searchParams.get("agent") || ""

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set("agent", e.target.value)
    } else {
      params.delete("agent")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  if (agents.length === 0) return null

  return (
    <div className="agent-filter">
      <label htmlFor="agent-select">Agent:</label>
      <select id="agent-select" value={current} onChange={onChange}>
        <option value="">All agents</option>
        {agents.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  )
}
