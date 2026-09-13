import { describe, it, expect } from 'vitest';
import { checkPermission, needsApproval, canAutoExecute } from '../index';
import { ToolPermission } from '@/lib/tools';

describe('Permission Engine', () => {
  describe('checkPermission', () => {
    it('should allow READ without approval', () => {
      const result = checkPermission(ToolPermission.READ);
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should not allow SUGGEST', () => {
      const result = checkPermission(ToolPermission.SUGGEST);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(false);
    });

    it('should require APPROVE when no existing approval', () => {
      const result = checkPermission(ToolPermission.APPROVE, false);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it('should allow APPROVE when existing approval', () => {
      const result = checkPermission(ToolPermission.APPROVE, true);
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should allow EXECUTE without approval', () => {
      const result = checkPermission(ToolPermission.EXECUTE);
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe('needsApproval', () => {
    it('should return false for READ', () => {
      expect(needsApproval(ToolPermission.READ)).toBe(false);
    });

    it('should return false for SUGGEST', () => {
      expect(needsApproval(ToolPermission.SUGGEST)).toBe(false);
    });

    it('should return true for APPROVE', () => {
      expect(needsApproval(ToolPermission.APPROVE)).toBe(true);
    });

    it('should return false for EXECUTE', () => {
      expect(needsApproval(ToolPermission.EXECUTE)).toBe(false);
    });
  });

  describe('canAutoExecute', () => {
    it('should return true for READ', () => {
      expect(canAutoExecute(ToolPermission.READ)).toBe(true);
    });

    it('should return false for SUGGEST', () => {
      expect(canAutoExecute(ToolPermission.SUGGEST)).toBe(false);
    });

    it('should return false for APPROVE', () => {
      expect(canAutoExecute(ToolPermission.APPROVE)).toBe(false);
    });

    it('should return true for EXECUTE', () => {
      expect(canAutoExecute(ToolPermission.EXECUTE)).toBe(true);
    });
  });
});
