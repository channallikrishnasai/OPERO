import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllTools, getToolNames } from '../implementations';

beforeAll(() => {
  registerAllTools();
});

describe('Tool API endpoint', () => {
  it('GET returns list of tools', async () => {
    const names = getToolNames();
    expect(names.length).toBeGreaterThanOrEqual(7);
    expect(names).toContain('orders.search');
  });

  it('valid tool call succeeds', async () => {
    const { getTool } = await import('../registry');
    const tool = getTool('orders.search');
    expect(tool).toBeDefined();
    const result = await tool!.execute({});
    expect(result.success).toBe(true);
  });

  it('unknown tool is rejected', async () => {
    const { getTool } = await import('../registry');
    const tool = getTool('nonexistent.tool');
    expect(tool).toBeUndefined();
  });

  it('malformed input is handled gracefully', async () => {
    const { getTool } = await import('../registry');
    const tool = getTool('orders.get');
    expect(tool).toBeDefined();
    const result = await tool!.execute({ orderId: 'nonexistent' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
