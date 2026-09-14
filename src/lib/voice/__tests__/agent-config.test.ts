import { describe, it, expect } from 'vitest';
import { getAssemblyAITools, SYSTEM_PROMPT, VOICE_AGENT_CONFIG } from '../agent-config';

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
    expect(SYSTEM_PROMPT).toContain('READ');
    expect(SYSTEM_PROMPT).toContain('browser.open');
    expect(SYSTEM_PROMPT).toContain('browser.type');
    expect(SYSTEM_PROMPT).toContain('orders.search');
    expect(SYSTEM_PROMPT).toContain('inventory.search');
  });

  it('should return AssemblyAI tool definitions', () => {
    const tools = getAssemblyAITools();
    expect(tools.length).toBeGreaterThanOrEqual(12);

    tools.forEach((tool) => {
      expect(tool.type).toBe('function');
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
      expect(tool.execution_mode).toBe('interactive');
    });
  });

  it('should include browser tools', () => {
    const tools = getAssemblyAITools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('browser.open');
    expect(names).toContain('browser.navigate');
    expect(names).toContain('browser.get_page');
    expect(names).toContain('browser.click');
    expect(names).toContain('browser.type');
    expect(names).toContain('browser.press');
    expect(names).toContain('browser.scroll');
    expect(names).toContain('browser.back');
    expect(names).toContain('browser.screenshot');
  });

  it('should include read tools', () => {
    const tools = getAssemblyAITools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('orders.search');
    expect(names).toContain('orders.get');
    expect(names).toContain('inventory.search');
    expect(names).toContain('machines.get');
    expect(names).toContain('incidents.search');
    expect(names).toContain('tasks.search');
  });

  it('should include action tools', () => {
    const tools = getAssemblyAITools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('orders.update');
    expect(names).toContain('orders.reassign');
    expect(names).toContain('inventory.reserve');
    expect(names).toContain('tasks.create');
    expect(names).toContain('tasks.update');
  });
});
