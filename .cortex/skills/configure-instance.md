# Configure Instance

This skill helps you populate and validate your instance configuration files. Use this when you need to update your project settings, add new environments, or validate your existing config.

## When to Use

- First time setting up the framework (after bootstrap)
- Changing database names, roles, or warehouse
- Adding a new semantic view or agent to the config
- Validating your config is consistent and complete

## Workflow

### Step 1: Check Current State

1. Read `instance/config/environments.yaml` (if it exists)
2. If it doesn't exist, check for `environments.yaml.template` and guide from scratch
3. Report current configuration state to the user

### Step 2: Gather Changes

Ask the user what they want to configure:
- **New project setup** — Fill in all template values
- **Add semantic view** — Add a new SV to existing config
- **Add agent** — Add a new agent to existing config
- **Change warehouse** — Update warehouse name/size
- **Update connections** — Change Snowflake connection settings
- **Validate** — Check config for completeness and consistency

### Step 3: Validate Configuration

Check for:
1. **Completeness** — All required fields populated (no `{{TOKEN}}` placeholders remaining)
2. **Consistency** — Database names match between environments and eval config
3. **Path validity** — Referenced SV/agent files exist in instance directory
4. **Role naming** — Roles follow naming convention (PROJECT_ROLE pattern)
5. **Cross-references** — eval.warehouse matches environments.warehouse

### Step 4: Write Config

Write the validated configuration to `instance/config/environments.yaml`.

If thresholds/monitoring/schedules templates haven't been activated:
- Copy `.template` files to their active names (without `.template` suffix)
- Inform user about customizable values

## Validation Rules

### environments.yaml
- `environments.dev.database` and `environments.prod.database` must be different
- `eval.database` must be different from both dev and prod
- All `*_path` values must be relative paths (no leading `/`)
- `semantic_view` must follow `DATABASE.SCHEMA.NAME` format
- `agent_name` must follow `DATABASE.SCHEMA.NAME` format

### thresholds.yaml
- `prod` thresholds must be >= `dev` thresholds
- All percentage values must be 0-100
- `metrics` list must contain valid metric names

### monitoring.yaml
- Cron expressions must be valid
- `threshold_pct` values must be 0-100
- `min_*` counts must be positive integers

## Output

After configuration:
1. Show the user their complete config
2. Confirm files written
3. Suggest next steps (create SV, create agent, or run bootstrap)
