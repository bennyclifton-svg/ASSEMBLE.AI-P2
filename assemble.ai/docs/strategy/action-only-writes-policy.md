# Action-Only Writes Policy

New agent and workflow mutations must go through the Application Action Registry.

An application action owns the stable action id, input schema, actor policy, preview or proposal diff, apply behavior, audit invocation row, and project-event emission for a project write. Agent-facing tools should expose actions through the action-to-agent adapter. Workflow write steps should reference registered action ids.

## Rules

- New mutating agent tools must be generated from a registered `ActionDefinition`, unless the tool is listed in the legacy exemption inventory below.
- New workflow write steps must use `WorkflowPlanStep.actionId` and that id must resolve through the action registry.
- Workflow plan modules must not call legacy write surfaces such as direct approval proposal helpers, agent applicators, or agent tool registration.
- Legacy exemptions are grandfathered migration debt, not permission to add more direct write tools.
- A legacy exemption must name the tool, domain, reason it remains exempt, and migration target or retirement path.
- Runner regex guard and recovery surfaces are frozen. Add typed schemas, action policies, deterministic validators, or workflow planning rules instead of adding new regex authority.

## Current Legacy Exemptions

| Tool | Domain | Why exempt for now | Migration target |
| --- | --- | --- | --- |
| `start_issue_variation_workflow` | workflow | Starts workflow state and materializes registered action steps; it must not apply project data directly. | Move workflow launchers into a typed workflow catalog while keeping every write step as a registered action. |
| `start_issue_variation_assessment_revision_workflow` | workflow | Starts workflow state and materializes registered action steps; it must not apply project data directly. | Move workflow launchers into a typed workflow catalog while keeping every write step as a registered action. |

All other mutating agent tools are action-backed. If a future direct mutating tool is added, the policy test fails until it is converted to a registered action or deliberately added to this inventory.

## Enforcement

The action-only tests fail when:

- a mutating agent tool is neither action-backed nor explicitly exempted here and in `LEGACY_MUTATING_TOOL_EXEMPTIONS`;
- an exemption names a tool that is no longer registered or is no longer mutating;
- an action-backed tool no longer resolves to its registered action;
- a workflow plan references an unregistered action id;
- a workflow plan module imports or calls a legacy write surface directly.
