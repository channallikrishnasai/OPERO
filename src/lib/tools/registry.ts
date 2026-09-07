import { ToolDefinition, ToolPermission } from './types';

const registry = new Map<string, ToolDefinition>();

export function registerTool<TInput, TOutput>(
  tool: ToolDefinition<TInput, TOutput>
): void {
  if (registry.has(tool.name)) {
    throw new Error(`Tool "${tool.name}" is already registered`);
  }
  registry.set(tool.name, tool as unknown as ToolDefinition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function hasTool(name: string): boolean {
  return registry.has(name);
}

export function getToolNames(): string[] {
  return Array.from(registry.keys());
}

export function getToolsByPermission(permission: ToolPermission): ToolDefinition[] {
  return Array.from(registry.values()).filter(
    (tool) => tool.permission === permission
  );
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(registry.values());
}
