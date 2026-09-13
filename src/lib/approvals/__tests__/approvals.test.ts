import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createApproval,
  getApproval,
  approveAction,
  rejectAction,
  getPendingApprovals,
} from '../service';

describe('Approval Service', () => {
  beforeEach(async () => {
    await prisma.approval.deleteMany();
  });

  describe('createApproval', () => {
    it('should create an approval request', async () => {
      const approval = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit of inventory',
        riskLevel: 'Consumes 1 unit',
      });

      expect(approval).toBeDefined();
      expect(approval.id).toBeTruthy();
      expect(approval.toolName).toBe('inventory.reserve');
      expect(approval.status).toBe('PENDING');
      expect(approval.description).toBe('Reserve 1 unit of inventory');
    });
  });

  describe('getApproval', () => {
    it('should retrieve an approval', async () => {
      const created = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      const retrieved = await getApproval(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return null for non-existent approval', async () => {
      const retrieved = await getApproval('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('approveAction', () => {
    it('should approve a pending approval', async () => {
      const created = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      const result = await approveAction(created.id);
      expect(result.success).toBe(true);
      expect(result.approval).toBeDefined();
      expect(result.approval!.status).toBe('APPROVED');
    });

    it('should fail for non-existent approval', async () => {
      const result = await approveAction('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for already resolved approval', async () => {
      const created = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      await approveAction(created.id);
      const result = await approveAction(created.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already');
    });
  });

  describe('rejectAction', () => {
    it('should reject a pending approval', async () => {
      const created = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      const result = await rejectAction(created.id);
      expect(result.success).toBe(true);
      expect(result.approval).toBeDefined();
      expect(result.approval!.status).toBe('REJECTED');
    });

    it('should fail for non-existent approval', async () => {
      const result = await rejectAction('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for already resolved approval', async () => {
      const created = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      await rejectAction(created.id);
      const result = await rejectAction(created.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals', async () => {
      await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      const pending = await getPendingApprovals();
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it('should not return resolved approvals', async () => {
      const created = await createApproval({
        toolName: 'inventory.reserve',
        toolInput: { inventoryItemId: 'test-id', quantity: 1 },
        description: 'Reserve 1 unit',
        riskLevel: 'Low risk',
      });

      await approveAction(created.id);

      const pending = await getPendingApprovals();
      const found = pending.find((p) => p.id === created.id);
      expect(found).toBeUndefined();
    });
  });
});
