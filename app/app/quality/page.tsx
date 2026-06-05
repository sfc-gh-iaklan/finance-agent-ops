import { querySnowflake } from "@/lib/snowflake"
import { AgentFilter } from "../components/agent-filter"
import { QualityFlagTooltip } from "../components/tooltips"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ agent?: string }>
}

export default async function QualityPage({ searchParams }: Props) {
  const { agent } = await searchParams
  const agentFilter = agent ? `WHERE agent_name = '${agent}'` : ""
  const flagsAgentFilter = agent ? `WHERE agent_name = '${agent}'` : ""

  let flags: Record<string, any>[] = []
  let daily: Record<string, any>[] = []
  let agents: string[] = []
  let error: string | null = null

  try {
    const agentRows = await querySnowflake(`
      SELECT DISTINCT agent_name FROM V_INTERACTION_QUALITY_FLAGS WHERE agent_name IS NOT NULL ORDER BY 1
    `)
    agents = agentRows.map((r: any) => r.AGENT_NAME).filter(Boolean)

    // Recent flagged interactions
    flags = await querySnowflake(`
      SELECT
        signal_source,
        interaction_id,
        environment,
        agent_name,
        user_query,
        severity,
        flag_tool_looping,
        flag_excessive_steps,
        flag_slow_request,
        flag_high_token_burn,
        flag_planning_error,
        total_duration_ms,
        total_tokens
      FROM V_INTERACTION_QUALITY_FLAGS
      ${flagsAgentFilter}
      ORDER BY event_time DESC
      LIMIT 20
    `)

    // Daily rollup
    daily = await querySnowflake(`
      SELECT
        summary_date,
        agent_name,
        total_requests,
        flagged_requests,
        flagged_request_pct,
        critical_count,
        warning_count
      FROM V_INTERACTION_QUALITY_DASHBOARD
      ${agentFilter}
      ORDER BY summary_date DESC
      LIMIT 14
    `)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error"
  }

  return (
    <>
      <AgentFilter agents={agents} />
      <h2 className="section-title">Interaction Quality</h2>
      <p className="section-subtitle">
        Rules-based detection of problematic agent interactions (no LLM needed).
        Click <strong>?</strong> on flags for remediation steps.
      </p>

      {error ? (
        <div className="error-box"><p>{error}</p></div>
      ) : (
        <>
          <h3>Daily Summary (last 14 days)</h3>
          {daily.length === 0 ? (
            <p>No quality data yet.</p>
          ) : (
            <table className="result-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Agent</th>
                  <th>Requests</th>
                  <th>Flagged</th>
                  <th>Flagged %</th>
                  <th>Critical</th>
                  <th>Warning</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((r, i) => (
                  <tr key={i}>
                    <td>{r.SUMMARY_DATE}</td>
                    <td>{r.AGENT_NAME}</td>
                    <td>{r.TOTAL_REQUESTS}</td>
                    <td>{r.FLAGGED_REQUESTS}</td>
                    <td className={r.FLAGGED_REQUEST_PCT > 20 ? "text-red" : ""}>{r.FLAGGED_REQUEST_PCT}%</td>
                    <td className={r.CRITICAL_COUNT > 0 ? "text-red" : ""}>{r.CRITICAL_COUNT}</td>
                    <td>{r.WARNING_COUNT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr className="divider" />

          <h3>Recent Flagged Interactions</h3>
          {flags.length === 0 ? (
            <p>No flagged interactions found.</p>
          ) : (
            <table className="result-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Agent</th>
                  <th>Query</th>
                  <th>Duration</th>
                  <th>Tokens</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((r, i) => {
                  const activeFlags: { key: string; label: string }[] = []
                  if (r.FLAG_TOOL_LOOPING) activeFlags.push({ key: "flag_tool_looping", label: "Loop" })
                  if (r.FLAG_EXCESSIVE_STEPS) activeFlags.push({ key: "flag_excessive_steps", label: "Steps" })
                  if (r.FLAG_SLOW_REQUEST) activeFlags.push({ key: "flag_slow_request", label: "Slow" })
                  if (r.FLAG_HIGH_TOKEN_BURN) activeFlags.push({ key: "flag_high_token_burn", label: "Burn" })
                  if (r.FLAG_PLANNING_ERROR) activeFlags.push({ key: "flag_planning_error", label: "Error" })

                  return (
                    <tr key={i}>
                      <td className={`severity-${(r.SEVERITY || "").toLowerCase()}`}>{r.SEVERITY}</td>
                      <td>{r.AGENT_NAME}</td>
                      <td className="truncate">{r.USER_QUERY}</td>
                      <td>{Math.round(r.TOTAL_DURATION_MS / 1000)}s</td>
                      <td>{(r.TOTAL_TOKENS / 1000).toFixed(1)}k</td>
                      <td>
                        {activeFlags.map((f) => (
                          <span key={f.key} className="flag-badge">
                            {f.label}
                            <QualityFlagTooltip flag={f.key} />
                          </span>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  )
}
