import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllTools } from '@/lib/tools/implementations';
import { getAssemblyAITools, SYSTEM_PROMPT, VOICE_AGENT_CONFIG } from '../agent-config';

beforeAll(() => {
  registerAllTools();
});

describe('Voice Agent Configuration', () => {
  it('should have correct agent name', () => {
    expect(VOICE_AGENT_CONFIG.name).toBe('OPERO');
  });

  it('should have a greeting', () => {
    expect(VOICE_AGENT_CONFIG.greeting).toBeTruthy();
    expect(VOICE_AGENT_CONFIG.greeting).toContain('OPERO');
  });

  it('should have system prompt with key instructions', () => {
    expect(SYSTEM_PROMPT).toContain('OPERO');
    expect(SYSTEM_PROMPT).toContain('Acme Operations');
    expect(SYSTEM_PROMPT).toContain('read-only');
    expect(SYSTEM_PROMPT).toContain('orders.search');
    expect(SYSTEM_PROMPT).toContain('inventory.search');
  });

  it('should return AssemblyAI tool definitions', () => {
    const tools = getAssemblyAITools();
    expect(tools.length).toBeGreaterThanOrEqual(7);

    tools.forEach((tool) => {
      expect(tool.type).toBe('function');
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
      expect(tool.execution_mode).toBe('interactive');
    });
  });

  it('should include all read tools', () => {
    const tools = getAssemblyAITools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('orders.search');
    expect(names).toContain('orders.get');
    expect(names).toContain('inventory.search');
    expect(names).toContain('machines.get');
    expect(names).toContain('incidents.search');
    expect(names).toContain('incidents.get');
    expect(names).toContain('tasks.search');
  });

  it('should not include non-READ tools', () => {
    const tools = getAssemblyAITools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain('orders.create');
    expect(names).not.toContain('orders.delete');
  });
});
