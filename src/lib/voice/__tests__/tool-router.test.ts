import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllTools } from '@/lib/tools/implementations';
import { handleToolCall } from '../tool-router';

beforeAll(() => {
  registerAllTools();
});

describe('Tool Router', () => {
  it('should execute a valid tool call', async () => {
    const result = await handleToolCall({
      call_id: 'test-1',
      name: 'orders.search',
      arguments: { limit: 2 },
    });

    expect(result.call_id).toBe('test-1');
    const parsed = JSON.parse(result.result);
    expect(parsed.success).toBe(true);
    expect(Array.isArray(parsed.data)).toBe(true);
  });

  it('should reject unknown tools', async () => {
    const result = await handleToolCall({
      call_id: 'test-2',
      name: 'nonexistent.tool',
      arguments: {},
    });

    expect(result.call_id).toBe('test-2');
    const parsed = JSON.parse(result.result);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe('TOOL_NOT_FOUND');
  });

  it('should handle malformed input gracefully', async () => {
    const result = await handleToolCall({
      call_id: 'test-3',
      name: 'orders.get',
      arguments: { orderId: 'nonexistent' },
    });

    expect(result.call_id).toBe('test-3');
    const parsed = JSON.parse(result.result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  it('should execute inventory.search', async () => {
    const result = await handleToolCall({
      call_id: 'test-4',
      name: 'inventory.search',
      arguments: { lowStock: true },
    });

    expect(result.call_id).toBe('test-4');
    const parsed = JSON.parse(result.result);
    expect(parsed.success).toBe(true);
    expect(Array.isArray(parsed.data)).toBe(true);
  });

  it('should execute incidents.search', async () => {
    const result = await handleToolCall({
      call_id: 'test-5',
      name: 'incidents.search',
      arguments: { severity: 'CRITICAL' },
    });

    expect(result.call_id).toBe('test-5');
    const parsed = JSON.parse(result.result);
    expect(parsed.success).toBe(true);
  });

  it('should execute tasks.search', async () => {
    const result = await handleToolCall({
      call_id: 'test-6',
      name: 'tasks.search',
      arguments: { status: 'PENDING' },
    });

    expect(result.call_id).toBe('test-6');
    const parsed = JSON.parse(result.result);
    expect(parsed.success).toBe(true);
  });
});
