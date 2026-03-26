/**
 * Server workflow engine now delegates to the shared workflow kernel.
 */
import { WorkflowKernel, V3_STAGES, type Stage } from "../../shared/workflow-kernel.js";
import { serverRuntime } from "../runtime/server-runtime.js";

export { V3_STAGES, type Stage };

export class WorkflowEngine extends WorkflowKernel {
  constructor() {
    super(serverRuntime);
  }
}

export const workflowEngine = new WorkflowEngine();
