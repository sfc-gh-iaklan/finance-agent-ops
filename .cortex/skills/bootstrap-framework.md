# Bootstrap Framework

This skill guides you through setting up the Snowflake AgentOps Framework for your project. It populates your instance config and creates all Snowflake objects (databases, schemas, roles, monitoring infrastructure).

## Workflow

### Step 1: Gather Project Configuration

Ask the user for:

1. **Project name** — Used as prefix for databases, roles, and warehouse (e.g. `SALES_AI` → `SALES_AI_DEV`, `SALES_AI_PROD`, `SALES_AI_EVAL`)
2. **Semantic view name** — The short name of their semantic view (e.g. `SALES_ANALYTICS_SV`)
3. **Agent name** — The short name of their Cortex Agent (e.g. `SALES_AGENT`)
4. **Warehouse size** — XSMALL, SMALL, MEDIUM, LARGE (default: XSMALL)
5. **Snowflake connection name** — Named connection in `~/.snowflake/connections.toml` (default: `default`)

### Step 2: Generate Config Files

Using the gathered values, populate the template files:

1. Copy `instance/config/environments.yaml.template` → `instance/config/environments.yaml`
2. Copy `instance/config/thresholds.yaml.template` → `instance/config/thresholds.yaml`
3. Copy `instance/config/monitoring.yaml.template` → `instance/config/monitoring.yaml`
4. Copy `instance/config/schedules.yaml.template` → `instance/config/schedules.yaml`

Replace all `{{TOKEN}}` placeholders:
- `{{PROJECT_NAME}}` → the project name (uppercase)
- `{{SV_NAME}}` → the semantic view short name
- `{{AGENT_NAME}}` → the agent short name
- `{{sv_filename}}` → the semantic view filename (lowercase, no extension)
- `{{agent_filename}}` → the agent filename (lowercase, no extension)

### Step 3: Create Snowflake Objects

Execute the setup SQL scripts in order, performing token substitution on each:

```
setup/01_create_databases.sql   — Creates DEV, PROD, EVAL databases + schemas + warehouse
setup/04_rbac_setup.sql         — Creates ANALYST, REVIEWER, DEPLOYER, ADMIN roles
setup/05_observability_setup.sql — Creates views over ai_observability_events
setup/07_monitoring_tables.sql  — Creates monitoring tables (feedback, usage, health, alerts)
setup/08_monitoring_tasks.sql   — Creates Snowflake Tasks (daily/weekly monitoring)
setup/09_monitoring_views.sql   — Creates trend views for dashboards
setup/10_monitoring_alerts.sql  — Creates Snowflake Alerts (7 alerts)
setup/11_interaction_quality_engine.sql — Creates interaction quality engine
```

Token substitution mapping for SQL scripts:
- `{{DB_DEV}}` → `<PROJECT_NAME>_DEV`
- `{{DB_PROD}}` → `<PROJECT_NAME>_PROD`
- `{{DB_EVAL}}` → `<PROJECT_NAME>_EVAL`
- `{{WAREHOUSE}}` → `<PROJECT_NAME>_WH`
- `{{SCHEMA_ANALYTICS}}` → `ANALYTICS`
- `{{SCHEMA_SEMANTIC}}` → `SEMANTIC`
- `{{SCHEMA_RESULTS}}` → `RESULTS`
- `{{SCHEMA_MONITORING}}` → `MONITORING`
- `{{SCHEMA_OBSERVABILITY}}` → `OBSERVABILITY`
- `{{ROLE_ANALYST}}` → `<PROJECT_NAME>_ANALYST`
- `{{ROLE_REVIEWER}}` → `<PROJECT_NAME>_REVIEWER`
- `{{ROLE_DEPLOYER}}` → `<PROJECT_NAME>_DEPLOYER`
- `{{ROLE_ADMIN}}` → `<PROJECT_NAME>_ADMIN`
- `{{SV_NAME}}` → semantic view short name
- `{{AGENT_NAME}}` → agent short name
- `{{EVAL_DATASET_TABLE}}` → `<AGENT_NAME>_EVAL_DATASET`
- `{{WAREHOUSE_SIZE}}` → chosen warehouse size

For each SQL file:
1. Read the file contents
2. Replace all `{{TOKEN}}` placeholders with the user's values
3. Split on `;` to get individual statements
4. Execute each statement via `snowflake_sql_execute`

### Step 4: Verify Setup

After all scripts complete:
1. Run `SHOW DATABASES LIKE '<PROJECT_NAME>%'` to confirm databases exist
2. Run `SHOW ROLES LIKE '<PROJECT_NAME>%'` to confirm roles exist
3. Run `SHOW WAREHOUSES LIKE '<PROJECT_NAME>%'` to confirm warehouse exists
4. Print a summary of what was created

### Step 5: Next Steps

Tell the user:
1. Add their semantic view YAML to `instance/semantic_views/dev/`
2. Add their agent SQL to `instance/agents/dev/`
3. Create question banks in `instance/question_banks/`
4. Set up GitHub Actions secrets (`SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`)
5. Push to their repo and open a PR to trigger CI evaluation

## Important Notes

- All SQL scripts use `{{TOKEN}}` placeholders that must be substituted before execution
- The framework requires ACCOUNTADMIN or equivalent privileges for initial setup
- After setup, day-to-day work uses the ANALYST/DEPLOYER roles
- The `config/defaults.yaml` (LLM models, pricing) does NOT need user editing — it's universal
