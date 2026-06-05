import { querySnowflake } from "@/lib/snowflake"
import { AgentFilter } from "../components/agent-filter"
import { AlertTooltip } from "../components/tooltips"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ agent?: string }>
}

export default async function AlertsPage({ searchParams }: Props) {
  const { agent } = await searchParams
  const agentFilter = agent ? `WHERE target_name = '${agent}'` : ""
  const agentFilterAnd = agent ? `AND target_name = '${agent}'` : ""

  let active: Record<string, any>[] = []
  let recent: Record<string, any>[] = []
  let agents: string[] = []
  let error: string | null = null

  try {
    const agentRows = await querySnowflake(`
      SELECT DISTINCT target_name FROM ALERT_HISTORY WHERE target_name IS NOT NULL ORDER BY 1
    `)
    agents = agentRows.map((r: any) => r.TARGET_NAME).filter(Boolean)

    active = await querySnowflake(`
      SELECT
        alert_id, alert_type, severity, environment,
        target_name, message, metric_value, threshold_value,
        created_at, hours_since_created
      FROM V_ACTIVE_ALERTS
      ${agentFilter}
      LIMIT 50
    `)

    recent = await querySnowflake(`
      SELECT
        alert_type, severity, environment, target_name,
        message, created_at, acknowledged
      FROM ALERT_HISTORY
      WHERE 1=1 ${agentFilterAnd}
      ORDER BY created_at DESC
      LIMIT 20
    `)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error"
  }

  return (
    <>
      <AgentFilter agents={agents} />
      <h2 className="section-title">Active Alerts</h2>
      <p className="section-subtitle">
        Unacknowledged alerts ordered by severity. Click <strong>?</strong> for resolution steps.
      </p>

      {error ? (
        <div className="error-box"><p>{error}</p></div>
      ) : active.length === 0 ? (
        <p className="success-box">No active alerts — all clear.</p>
      ) : (
        <table className="result-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Type</th>
              <th>Target</th>
              <th>Message</th>
              <th>Hours Ago</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            {active.map((a, i) => (
              <tr key={i}>
                <td className={`severity-${(a.SEVERITY || "").toLowerCase()}`}>{a.SEVERITY}</td>
                <td>{a.ALERT_TYPE}</td>
                <td>{a.TARGET_NAME}</td>
                <td>{a.MESSAGE}</td>
                <td>{a.HOURS_SINCE_CREATED}h</td>
                <td><AlertTooltip alertType={a.ALERT_TYPE} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr className="divider" />

      <h2 className="section-title">Alert History</h2>
      {recent.length === 0 ? (
        <p>No alert history.</p>
      ) : (
        <table className="result-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Type</th>
              <th>Target</th>
              <th>Message</th>
              <th>Created</th>
              <th>Ack</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a, i) => (
              <tr key={i}>
                <td className={`severity-${(a.SEVERITY || "").toLowerCase()}`}>{a.SEVERITY}</td>
                <td>{a.ALERT_TYPE}</td>
                <td>{a.TARGET_NAME}</td>
                <td className="truncate">{a.MESSAGE}</td>
                <td>{a.CREATED_AT}</td>
                <td>{a.ACKNOWLEDGED ? "✓" : "—"}</td>
                <td><AlertTooltip alertType={a.ALERT_TYPE} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
