# Plan: Full Repo Restructure

## Current State (39 files)

```
.cortex/skills/bootstrap-from-existing.md    # KEEP (CoCo skill)
.github/workflows/agent_cd.yml              # MOVE → ci/github/
.github/workflows/agent_ci.yml              # MOVE → ci/github/
.github/workflows/semantic_view_cd.yml      # MOVE → ci/github/
.github/workflows/semantic_view_ci.yml      # MOVE → ci/github/
.gitignore                                  # KEEP
AGENT.md                                    # UPDATE
CHANGELOG.md                                # KEEP
CONTRIBUTING.md                             # UPDATE
LICENSE                                     # KEEP
NOTICE                                      # KEEP
README.md                                   # UPDATE
architecture.html                           # REMOVE (stale, replaced by docs)
config/defaults.yaml                        # KEEP (universal framework defaults)
docs/README.md                              # UPDATE
docs/explanation/pillar-1-input-governance.md # KEEP
docs/reference/cost-model.md                # KEEP
evaluation/adversarial_library.yaml         # KEEP
evaluation/audit_agent.py                   # KEEP
evaluation/audit_semantic_view.py           # KEEP
evaluation/discover_account.py              # KEEP
evaluation/evaluate_semantic_view.py        # KEEP
evaluation/generate_question_bank.py        # KEEP
evaluation/llm_judge.py                     # KEEP
evaluation/utils.py                         # UPDATE
instance/config/environments.yaml.template  # MOVE → config/
instance/config/monitoring.yaml.template    # MOVE → config/
instance/config/thresholds.yaml.template    # MOVE → config/
instance/agents/dev/.gitkeep                # REMOVE
instance/agents/prod/.gitkeep               # REMOVE
instance/question_banks/agent/.gitkeep      # MOVE → question_banks/agent/
instance/question_banks/semantic_view/.gitkeep # MOVE → question_banks/semantic_view/
instance/semantic_views/dev/.gitkeep        # REMOVE
instance/semantic_views/prod/.gitkeep       # REMOVE
monitoring/cost_reconcile.py                # MOVE → evaluation/
monitoring/dashboard.py                     # REMOVE (replaced by App Runtime)
monitoring/health_check.py                  # MOVE → evaluation/
monitoring/pyproject.toml                   # REMOVE
monitoring/snowflake.yml.template           # REMOVE
requirements.txt                            # UPDATE
setup/00_framework_tables.sql               # KEEP
setup/deploy.py                             # KEEP
```

## Proposed New Structure

```
Snowflake_AgentOps_Framework/
├── .cortex/skills/
│   └── bootstrap-from-existing.md      # CoCo interactive bootstrap
├── app/                                 # App Runtime monitoring dashboard (NEW)
│   ├── app.yml                         # App Runtime manifest
│   ├── package.json
│   ├── next.config.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Main dashboard page
│   │   │   ├── accuracy/page.tsx      # Eval accuracy trends
│   │   │   ├── quality/page.tsx       # Interaction quality
│   │   │   ├── cost/page.tsx          # Token cost trends
│   │   │   └── alerts/page.tsx        # Active alerts
│   │   └── lib/
│   │       └── snowflake.ts           # Snowflake SQL helper
│   └── tsconfig.json
├── ci/                                  # CI/CD — vendor-neutral
│   ├── README.md                       # Pipeline stages doc (audit → eval → deploy)
│   └── github/                         # GitHub Actions examples
│       ├── agent_cd.yml
│       ├── agent_ci.yml
│       ├── semantic_view_cd.yml
│       └── semantic_view_ci.yml
├── config/                              # All configuration (flat)
│   ├── defaults.yaml                   # Framework defaults (LLM, pricing)
│   ├── environments.yaml.template      # Instance config template
│   ├── monitoring.yaml.template        # Alert thresholds
│   └── thresholds.yaml.template        # Eval accuracy thresholds
├── docs/
│   ├── README.md
│   ├── explanation/
│   │   └── pillar-1-input-governance.md
│   └── reference/
│       └── cost-model.md
├── evaluation/                          # All evaluation + monitoring Python
│   ├── adversarial_library.yaml
│   ├── audit_agent.py
│   ├── audit_semantic_view.py
│   ├── cost_reconcile.py              # (moved from monitoring/)
│   ├── discover_account.py
│   ├── evaluate_semantic_view.py
│   ├── generate_question_bank.py
│   ├── health_check.py               # (moved from monitoring/)
│   ├── llm_judge.py
│   └── utils.py
├── question_banks/                      # User's question banks (flat)
│   ├── agent/.gitkeep
│   └── semantic_view/.gitkeep
├── setup/
│   ├── 00_framework_tables.sql         # All framework SQL objects
│   └── deploy.py                       # Deploy SV/agent (CI helper)
├── .gitignore
├── AGENT.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── NOTICE
├── README.md
└── requirements.txt
```

## Key Changes

### 1. Flatten `instance/` → root `config/` + `question_banks/`
- `instance/config/*.template` → `config/*.template`
- `instance/question_banks/` → `question_banks/`
- Remove `instance/agents/` and `instance/semantic_views/` (users don't need local copies — objects already exist in Snowflake)
- Delete `instance/` directory entirely
- Update `utils.py` to resolve config from `config/` instead of `instance/config/`

### 2. Vendor-neutral `ci/` folder
- Move `.github/workflows/*.yml` → `ci/github/` 
- Remove `.github/` directory
- Add `ci/README.md` documenting the pipeline stages:
  1. **Audit** — `python evaluation/audit_semantic_view.py` (structural checks, free)
  2. **Evaluate** — `python evaluation/evaluate_semantic_view.py` (LLM-judged accuracy)
  3. **Deploy** — `python setup/deploy.py` (promote to prod)
  4. **Agent Eval** — `python evaluation/audit_agent.py` (native GPA evaluation)
- Explain how to wire these into GitHub Actions, GitLab CI, Azure DevOps, etc.

### 3. Remove Streamlit → Scaffold App Runtime
- Delete `monitoring/dashboard.py`, `monitoring/pyproject.toml`, `monitoring/snowflake.yml.template`
- Scaffold `app/` with App Runtime structure (Next.js, TypeScript)
- Dashboard pages: Accuracy trends, Interaction quality, Token costs, Active alerts
- Queries reference `{{FRAMEWORK_DB}}.{{FRAMEWORK_SCHEMA}}` views

### 4. Consolidate `monitoring/` into `evaluation/`
- Move `monitoring/health_check.py` → `evaluation/health_check.py`
- Move `monitoring/cost_reconcile.py` → `evaluation/cost_reconcile.py`
- They already import from `evaluation/utils.py` (with sys.path hacks) — colocation removes that hack
- Delete empty `monitoring/` folder

### 5. Remove `architecture.html`
- It's a large HTML file with embedded diagrams that references the old structure
- The docs/ folder serves this purpose better
- Can be regenerated if needed

### 6. Update `utils.py` config resolution
- Change `DEFAULT_INSTANCE` logic to look for `config/environments.yaml` at repo root
- Remove the `AIOPS_INSTANCE` env var concept (no longer needed since instance/ is gone)
- Config path: `<repo_root>/config/environments.yaml`
- Question bank path: `<repo_root>/question_banks/`

## Files to Delete (total: 12)
- `instance/` (entire directory tree)
- `monitoring/dashboard.py`
- `monitoring/pyproject.toml`
- `monitoring/snowflake.yml.template`
- `architecture.html`
- `.github/workflows/` (moved to ci/)

## Files to Create (total: ~12)
- `ci/README.md`
- `ci/github/agent_cd.yml` (moved)
- `ci/github/agent_ci.yml` (moved)
- `ci/github/semantic_view_cd.yml` (moved)
- `ci/github/semantic_view_ci.yml` (moved)
- `app/app.yml`
- `app/package.json`
- `app/next.config.js`
- `app/tsconfig.json`
- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`
- `app/src/lib/snowflake.ts`
- Additional page files

## Out of Scope
- Rewriting the evaluation Python scripts themselves (they work fine)
- Changing the SQL framework tables
- Modifying the CI/CD pipeline logic (just reorganizing files)
