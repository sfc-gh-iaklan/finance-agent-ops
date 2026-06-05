import { querySnowflake } from "@/lib/snowflake"
import { AgentFilter } from "./components/agent-filter"
import { AlertTooltip } from "./components/tooltips"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ agent?: string }>
}

export default async function Overview({ searchParams }: Props) {
  const { agent } = await searchParams
  const agentFilter = agent ? `AND agent_or_sv_name = '${agent}'` : ""
  const alertAgentFilter = agent ? `AND target_name = '${agent}'` : ""

  let metrics: Record<string, any> | null = null
  let recentAlerts: Record<string, any>[] = []
  let agents: string[] = []
  let error: string | null = null

  try {
    // Get distinct agents for the filter
    const agentRows = await querySnowflake(`
      SELECT DISTINCT agent_or_sv_name FROM USAGE_METRICS ORDER BY 1
    `)
    agents = agentRows.map((r: any) => r.AGENT_OR_SV_NAME).filter(Boolean)

    // Summary KPIs from the last 7 days
    const kpiRows = await querySnowflake(`
      SELECT
        COALESCE(SUM(total_requests), 0) AS total_requests_7d,
        COALESCE(SUM(successful_requests), 0) AS successful_7d,
        COALESCE(SUM(failed_requests), 0) AS failed_7d,
        ROUND(COALESCE(SUM(estimated_credits), 0), 4) AS credits_7d,
        ROUND(COALESCE(AVG(avg_latency_ms), 0), 0) AS avg_latency_ms
      FROM USAGE_METRICS
      WHERE metric_date >= DATEADD('day', -7, CURRENT_DATE())
      ${agentFilter}
    `)
    metrics = kpiRows[0] ?? null

    // Recent unacknowledged alerts
    recentAlerts = await querySnowflake(`
      SELECT alert_type, severity, target_name, message,
             DATEDIFF('hour', created_at, CURRENT_TIMESTAMP()) AS hours_ago
      FROM ALERT_HISTORY
      WHERE acknowledged = FALSE
      ${alertAgentFilter}
      ORDER BY created_at DESC
      LIMIT 5
    `)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error"
  }

  return (
    <>
      <AgentFilter agents={agents} />
      <h2 className="section-title">7-Day Overview</h2>

      {error ? (
        <div className="error-box"><p>{error}</p></div>
      ) : metrics ? (
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-value">{metrics.TOTAL_REQUESTS_7D}</span>
            <span className="kpi-label">Requests</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">
              {metrics.TOTAL_REQUESTS_7D > 0
                ? Math.round((metrics.SUCCESSFUL_7D / metrics.TOTAL_REQUESTS_7D) * 100)
                : 0}%
            </span>
            <span className="kpi-label">Success Rate</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{metrics.CREDITS_7D}</span>
            <span className="kpi-label">AI Credits</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{metrics.AVG_LATENCY_MS}ms</span>
            <span className="kpi-label">Avg Latency</span>
          </div>
        </div>
      ) : null}

      <hr className="divider" />

      <h2 className="section-title">Active Alerts</h2>
      {recentAlerts.length === 0 ? (
        <p className="section-subtitle">No active alerts.</p>
      ) : (
        <table className="result-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Type</th>
              <th>Target</th>
              <th>Message</th>
              <th>Hours Ago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentAlerts.map((a, i) => (
              <tr key={i}>
                <td className={`severity-${(a.SEVERITY || "").toLowerCase()}`}>{a.SEVERITY}</td>
                <td>{a.ALERT_TYPE}</td>
                <td>{a.TARGET_NAME}</td>
                <td>{a.MESSAGE}</td>
                <td>{a.HOURS_AGO}h</td>
                <td><AlertTooltip alertType={a.ALERT_TYPE} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
