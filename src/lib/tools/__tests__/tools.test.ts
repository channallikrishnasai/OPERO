import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllTools } from '../implementations';
import { getTool } from '../registry';

beforeAll(() => {
  registerAllTools();
});

describe('orders.search', () => {
  it('should return orders', async () => {
    const tool = getTool('orders.search');
    expect(tool).toBeDefined();
    const result = await tool!.execute({});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('should filter delayed orders', async () => {
    const tool = getTool('orders.search');
    const result = await tool!.execute({ delayed: true });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((order) => {
      expect(order.isDelayed).toBe(true);
    });
  });

  it('should filter by priority', async () => {
    const tool = getTool('orders.search');
    const result = await tool!.execute({ priority: 'URGENT' });
    expect(result.success).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((order) => {
      expect(order.priority).toBe('URGENT');
    });
  });

  it('should respect limit', async () => {
    const tool = getTool('orders.search');
    const result = await tool!.execute({ limit: 3 });
    expect(result.success).toBe(true);
    expect((result.data as unknown[]).length).toBeLessThanOrEqual(3);
  });
});

describe('inventory.search', () => {
  it('should return inventory items', async () => {
    const tool = getTool('inventory.search');
    expect(tool).toBeDefined();
    const result = await tool!.execute({});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('should identify low stock items', async () => {
    const tool = getTool('inventory.search');
    const result = await tool!.execute({ lowStock: true });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((item) => {
      expect(item.isLowStock).toBe(true);
    });
  });

  it('should filter by location', async () => {
    const tool = getTool('inventory.search');
    const result = await tool!.execute({ location: 'Warehouse A' });
    expect(result.success).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((item) => {
      expect(item.location).toContain('Warehouse A');
    });
  });
});

describe('machines.get', () => {
  it('should return error for nonexistent machine', async () => {
    const tool = getTool('machines.get');
    const result = await tool!.execute({ machineId: 'nonexistent' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('MACHINE_NOT_FOUND');
  });
});

describe('incidents.search', () => {
  it('should return incidents', async () => {
    const tool = getTool('incidents.search');
    expect(tool).toBeDefined();
    const result = await tool!.execute({});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('should filter by severity', async () => {
    const tool = getTool('incidents.search');
    const result = await tool!.execute({ severity: 'CRITICAL' });
    expect(result.success).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((incident) => {
      expect(incident.severity).toBe('CRITICAL');
    });
  });

  it('should filter by status', async () => {
    const tool = getTool('incidents.search');
    const result = await tool!.execute({ status: 'OPEN' });
    expect(result.success).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((incident) => {
      expect(incident.status).toBe('OPEN');
    });
  }, 10000);
});

describe('tasks.search', () => {
  it('should return tasks', async () => {
    const tool = getTool('tasks.search');
    expect(tool).toBeDefined();
    const result = await tool!.execute({});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[]).length).toBeGreaterThan(0);
  }, 10000);

  it('should filter by priority', async () => {
    const tool = getTool('tasks.search');
    const result = await tool!.execute({ priority: 'URGENT' });
    expect(result.success).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((task) => {
      expect(task.priority).toBe('URGENT');
    });
  }, 10000);

  it('should filter by status', async () => {
    const tool = getTool('tasks.search');
    const result = await tool!.execute({ status: 'PENDING' });
    expect(result.success).toBe(true);
    (result.data as Array<Record<string, unknown>>).forEach((task) => {
      expect(task.status).toBe('PENDING');
    });
  }, 10000);
});
