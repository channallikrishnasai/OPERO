export enum ToolPermission {
  READ = 'READ',
  SUGGEST = 'SUGGEST',
  APPROVE = 'APPROVE',
  EXECUTE = 'EXECUTE',
}

export interface ToolError {
  code: string;
  message: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data: T;
  error?: ToolError;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (input: TInput) => Promise<ToolResult<TOutput>>;
}

export interface ToolCallRequest {
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolCallResponse {
  success: boolean;
  data?: unknown;
  error?: ToolError;
}
