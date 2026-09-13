import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllTools, getTool } from '@/lib/tools';
import { prisma } from '@/lib/prisma';
import { ordersUpdateTool } from '../orders.update';
import { ordersReassignTool } from '../orders.reassign';
import { inventoryReserveTool } from '../inventory.reserve';
import { tasksCreateTool } from '../tasks.create';
import { tasksUpdateTool } from '../tasks.update';

beforeAll(() => {
  registerAllTools();
});

describe('Write Tools', () => {
  describe('orders.update', () => {
    it('should be registered with EXECUTE permission', () => {
      const tool = getTool('orders.update');
      expect(tool).toBeDefined();
      expect(tool!.permission).toBe('EXECUTE');
    });

    it('should update order status', async () => {
      const order = await prisma.order.findFirst();
      if (!order) return;

      const result = await ordersUpdateTool.execute({
        orderId: order.id,
        status: 'SHIPPED',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('SHIPPED');

      await prisma.order.update({
        where: { id: order.id },
        data: { status: order.status },
      });
    }, 10000);

    it('should update order priority', async () => {
      const order = await prisma.order.findFirst();
      if (!order) return;

      const result = await ordersUpdateTool.execute({
        orderId: order.id,
        priority: 'URGENT',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.priority).toBe('URGENT');

      await prisma.order.update({
        where: { id: order.id },
        data: { priority: order.priority },
      });
    }, 10000);

    it('should fail for non-existent order', async () => {
      const result = await ordersUpdateTool.execute({
        orderId: 'non-existent-id',
        status: 'SHIPPED',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('ORDER_NOT_FOUND');
    }, 10000);

    it('should fail when no fields provided', async () => {
      const order = await prisma.order.findFirst();
      if (!order) return;

      const result = await ordersUpdateTool.execute({
        orderId: order.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('INVALID_INPUT');
    }, 10000);
  });

  describe('orders.reassign', () => {
    it('should be registered with APPROVE permission', () => {
      const tool = getTool('orders.reassign');
      expect(tool).toBeDefined();
      expect(tool!.permission).toBe('APPROVE');
    });

    it('should reassign order after approval', async () => {
      const order = await prisma.order.findFirst();
      if (!order) return;

      const result = await ordersReassignTool.execute({
        orderId: order.id,
        assignedTo: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.assignedTo).toBe('Test User');

      await prisma.order.update({
        where: { id: order.id },
        data: { assignedTo: order.assignedTo },
      });
    }, 10000);

    it('should fail for non-existent order', async () => {
      const result = await ordersReassignTool.execute({
        orderId: 'non-existent-id',
        assignedTo: 'Test User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('ORDER_NOT_FOUND');
    }, 10000);
  });

  describe('inventory.reserve', () => {
    it('should be registered with APPROVE permission', () => {
      const tool = getTool('inventory.reserve');
      expect(tool).toBeDefined();
      expect(tool!.permission).toBe('APPROVE');
    });

    it('should reserve inventory after approval', async () => {
      const item = await prisma.inventoryItem.findFirst({
        where: { quantity: { gte: 5 } },
      });
      if (!item) {
        console.log('No inventory item with quantity >= 5 found, skipping test');
        return;
      }

      const result = await inventoryReserveTool.execute({
        inventoryItemId: item.id,
        quantity: 1,
      });

      console.log('Reserve result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.previousQuantity).toBe(item.quantity);
      expect(result.data.reservedQuantity).toBe(1);
      expect(result.data.newQuantity).toBe(item.quantity - 1);

      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: item.quantity },
      });
    }, 10000);

    it('should reject zero quantity', async () => {
      const item = await prisma.inventoryItem.findFirst();
      if (!item) return;

      const result = await inventoryReserveTool.execute({
        inventoryItemId: item.id,
        quantity: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('INVALID_QUANTITY');
    }, 10000);

    it('should reject negative quantity', async () => {
      const item = await prisma.inventoryItem.findFirst();
      if (!item) return;

      const result = await inventoryReserveTool.execute({
        inventoryItemId: item.id,
        quantity: -1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('INVALID_QUANTITY');
    }, 10000);

    it('should reject insufficient inventory', async () => {
      const item = await prisma.inventoryItem.findFirst();
      if (!item) return;

      const result = await inventoryReserveTool.execute({
        inventoryItemId: item.id,
        quantity: item.quantity + 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('INSUFFICIENT_INVENTORY');
    }, 10000);

    it('should fail for non-existent item', async () => {
      const result = await inventoryReserveTool.execute({
        inventoryItemId: 'non-existent-id',
        quantity: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('ITEM_NOT_FOUND');
    }, 10000);
  });

  describe('tasks.create', () => {
    it('should be registered with APPROVE permission', () => {
      const tool = getTool('tasks.create');
      expect(tool).toBeDefined();
      expect(tool!.permission).toBe('APPROVE');
    });

    it('should create task after approval', async () => {
      const result = await tasksCreateTool.execute({
        title: 'Test Task',
        description: 'Test Description',
        priority: 'HIGH',
        assignedTo: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe('Test Task');
      expect(result.data.priority).toBe('HIGH');

      if (result.data?.taskId) {
        await prisma.task.delete({ where: { id: result.data.taskId } });
      }
    }, 10000);
  });

  describe('tasks.update', () => {
    it('should be registered with APPROVE permission', () => {
      const tool = getTool('tasks.update');
      expect(tool).toBeDefined();
      expect(tool!.permission).toBe('APPROVE');
    });

    it('should update task after approval', async () => {
      const task = await prisma.task.findFirst();
      if (!task) return;

      const result = await tasksUpdateTool.execute({
        taskId: task.id,
        status: 'COMPLETED',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('COMPLETED');

      await prisma.task.update({
        where: { id: task.id },
        data: { status: task.status },
      });
    }, 10000);

    it('should fail for non-existent task', async () => {
      const result = await tasksUpdateTool.execute({
        taskId: 'non-existent-id',
        status: 'COMPLETED',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('TASK_NOT_FOUND');
    }, 10000);

    it('should fail when no fields provided', async () => {
      const task = await prisma.task.findFirst();
      if (!task) return;

      const result = await tasksUpdateTool.execute({
        taskId: task.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('INVALID_INPUT');
    }, 10000);
  });
});
