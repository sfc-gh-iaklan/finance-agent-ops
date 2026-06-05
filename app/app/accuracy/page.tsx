import { querySnowflake } from "@/lib/snowflake"
import { AgentFilter } from "../components/agent-filter"
import { AccuracyTooltip } from "../components/tooltips"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ agent?: string }>
}

export default async function AccuracyPage({ searchParams }: Props) {
  const { agent } = await searchParams
  const agentFilter = agent ? `WHERE target_name = '${agent}'` : ""

  let trends: Record<string, any>[] = []
  let agents: string[] = []
  let error: string | null = null

  try {
    const agentRows = await querySnowflake(`
      SELECT DISTINCT target_name FROM V_EVAL_ACCURACY_TREND ORDER BY 1
    `)
    agents = agentRows.map((r: any) => r.TARGET_NAME).filter(Boolean)

    trends = await querySnowflake(`
      SELECT
        eval_date,
        eval_type,
        environment,
        target_name,
        accuracy_pct,
        threshold_pct,
        passed_threshold,
        accuracy_delta
      FROM V_EVAL_ACCURACY_TREND
      ${agentFilter}
      ORDER BY eval_date DESC
      LIMIT 50
    `)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error"
  }

  return (
    <>
      <AgentFilter agents={agents} />
      <h2 className="section-title">Evaluation Accuracy Trends</h2>
      <p className="section-subtitle">
        Accuracy over time for semantic view and agent evaluations.
        Click <strong>?</strong> on failing rows for resolution steps.
      </p>

      {error ? (
        <div className="error-box"><p>{error}</p></div>
      ) : trends.length === 0 ? (
        <p>No evaluation runs found yet. Run: <code>python evaluation/evaluate_semantic_view.py --environment dev</code></p>
      ) : (
        <table className="result-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Target</th>
              <th>Accuracy</th>
              <th>Threshold</th>
              <th>Delta</th>
              <th>Passed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trends.map((r, i) => (
              <tr key={i}>
                <td>{r.EVAL_DATE}</td>
                <td>{r.EVAL_TYPE}</td>
                <td>{r.TARGET_NAME}</td>
                <td>{r.ACCURACY_PCT}%</td>
                <td>{r.THRESHOLD_PCT}%</td>
                <td className={r.ACCURACY_DELTA < 0 ? "text-red" : "text-green"}>
                  {r.ACCURACY_DELTA != null ? `${r.ACCURACY_DELTA > 0 ? "+" : ""}${r.ACCURACY_DELTA}%` : "—"}
                </td>
                <td>{r.PASSED_THRESHOLD ? "✓" : "✗"}</td>
                <td>
                  <AccuracyTooltip passed={r.PASSED_THRESHOLD} delta={r.ACCURACY_DELTA} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
