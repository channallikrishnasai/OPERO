import { describe, it, expect, beforeAll } from 'vitest';
import {
  getTool,
  hasTool,
  getToolNames,
  getToolsByPermission,
  getAllTools,
} from '../registry';
import { registerAllTools } from '../implementations';
import { ToolPermission } from '../types';

beforeAll(() => {
  registerAllTools();
});

describe('Tool Registry', () => {
  it('should resolve a valid tool', () => {
    const tool = getTool('orders.search');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('orders.search');
  });

  it('should reject unknown tool', () => {
    const tool = getTool('nonexistent.tool');
    expect(tool).toBeUndefined();
  });

  it('hasTool returns true for registered tools', () => {
    expect(hasTool('orders.search')).toBe(true);
    expect(hasTool('inventory.search')).toBe(true);
    expect(hasTool('machines.get')).toBe(true);
    expect(hasTool('incidents.search')).toBe(true);
    expect(hasTool('tasks.search')).toBe(true);
  });

  it('hasTool returns false for unregistered tools', () => {
    expect(hasTool('fake.tool')).toBe(false);
  });

  it('getToolNames returns all registered tool names', () => {
    const names = getToolNames();
    expect(names).toContain('orders.search');
    expect(names).toContain('orders.get');
    expect(names).toContain('inventory.search');
    expect(names).toContain('machines.get');
    expect(names).toContain('incidents.search');
    expect(names).toContain('incidents.get');
    expect(names).toContain('tasks.search');
  });

  it('getToolsByPermission filters by permission', () => {
    const readTools = getToolsByPermission(ToolPermission.READ);
    expect(readTools.length).toBeGreaterThanOrEqual(7);
    readTools.forEach((tool) => {
      expect(tool.permission).toBe(ToolPermission.READ);
    });
  });

  it('getAllTools returns all tools', () => {
    const tools = getAllTools();
    expect(tools.length).toBeGreaterThanOrEqual(7);
  });

  it('tool has correct structure', () => {
    const tool = getTool('orders.search');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('orders.search');
    expect(tool?.description).toBeTruthy();
    expect(tool?.permission).toBe(ToolPermission.READ);
    expect(tool?.inputSchema).toBeDefined();
    expect(tool?.inputSchema.type).toBe('object');
    expect(typeof tool?.execute).toBe('function');
  });
});
