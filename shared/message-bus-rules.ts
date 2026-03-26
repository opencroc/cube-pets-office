import {
  WORKFLOW_STAGES,
  type AgentRecord,
  type WorkflowStage,
} from "./workflow-runtime.js";

export const WORKFLOW_STAGE_SET = new Set<string>(WORKFLOW_STAGES);

export function isDirectReport(
  manager: Pick<AgentRecord, "role" | "manager_id" | "id">,
  worker: Pick<AgentRecord, "role" | "manager_id" | "id">
): boolean {
  return (
    manager.role === "manager" &&
    worker.role === "worker" &&
    worker.manager_id === manager.id
  );
}

export function validateStageRoute(
  from: Pick<AgentRecord, "role" | "department" | "manager_id" | "id">,
  to: Pick<AgentRecord, "role" | "department" | "manager_id" | "id">,
  stage: WorkflowStage
): boolean {
  switch (stage) {
    case "direction":
      return from.role === "ceo" && to.role === "manager";
    case "planning":
      return isDirectReport(from, to);
    case "execution":
    case "revision":
      return isDirectReport(to, from);
    case "review":
      return isDirectReport(from, to);
    case "meta_audit":
      return from.department === "meta";
    case "verify":
      return isDirectReport(from, to) || isDirectReport(to, from);
    case "summary":
      return from.role === "manager" && to.role === "ceo";
    case "feedback":
      return from.role === "ceo" && to.role === "manager";
    case "evolution":
      return from.id === to.id || from.department === "meta";
  }
}

export function validateHierarchy(
  from: Pick<AgentRecord, "role" | "department" | "manager_id" | "id">,
  to: Pick<AgentRecord, "role" | "department" | "manager_id" | "id">
): boolean {
  if (from.role === "ceo" && to.role === "manager") return true;
  if (from.role === "manager" && to.role === "ceo") return true;
  if (isDirectReport(from, to)) return true;
  if (isDirectReport(to, from)) return true;
  if (from.department === "meta" && from.role !== "ceo") return true;
  return false;
}
