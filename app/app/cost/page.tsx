import { querySnowflake } from "@/lib/snowflake"
import { AgentFilter } from "../components/agent-filter"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ agent?: string }>
}

export default async function CostPage({ searchParams }: Props) {
  const { agent } = await searchParams
  const agentFilter = agent ? `WHERE agent_or_sv_name = '${agent}'` : ""

  let trends: Record<string, any>[] = []
  let agents: string[] = []
  let error: string | null = null

  try {
    const agentRows = await querySnowflake(`
      SELECT DISTINCT agent_or_sv_name FROM USAGE_METRICS WHERE agent_or_sv_name IS NOT NULL ORDER BY 1
    `)
    agents = agentRows.map((r: any) => r.AGENT_OR_SV_NAME).filter(Boolean)

    trends = await querySnowflake(`
      SELECT
        metric_date,
        environment,
        service_type,
        agent_or_sv_name,
        total_requests,
        total_tokens,
        estimated_credits,
        avg_latency_ms,
        p95_latency_ms,
        rolling_7d_credits,
        error_rate_pct
      FROM V_TOKEN_COST_TREND
      ${agentFilter}
      ORDER BY metric_date DESC
      LIMIT 30
    `)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error"
  }

  return (
    <>
      <AgentFilter agents={agents} />
      <h2 className="section-title">Token Cost &amp; Usage</h2>
      <p className="section-subtitle">
        Daily token consumption and estimated AI Credit costs.
      </p>

      {error ? (
        <div className="error-box"><p>{error}</p></div>
      ) : trends.length === 0 ? (
        <p>No usage data yet. The daily aggregation task populates this.</p>
      ) : (
        <table className="result-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Target</th>
              <th>Requests</th>
              <th>Tokens</th>
              <th>Credits</th>
              <th>Avg Latency</th>
              <th>P95</th>
              <th>Error %</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((r, i) => (
              <tr key={i}>
                <td>{r.METRIC_DATE}</td>
                <td>{r.SERVICE_TYPE}</td>
                <td>{r.AGENT_OR_SV_NAME}</td>
                <td>{r.TOTAL_REQUESTS}</td>
                <td>{(r.TOTAL_TOKENS / 1000).toFixed(1)}k</td>
                <td>{Number(r.ESTIMATED_CREDITS).toFixed(4)}</td>
                <td>{Math.round(r.AVG_LATENCY_MS)}ms</td>
                <td>{Math.round(r.P95_LATENCY_MS)}ms</td>
                <td className={r.ERROR_RATE_PCT > 10 ? "text-red" : ""}>{r.ERROR_RATE_PCT}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
