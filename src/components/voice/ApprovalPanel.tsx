'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ApprovalRequest {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  riskLevel: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  callId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface ApprovalPanelProps {
  onApprovalResolved?: (approvalId: string, status: string) => void;
}

export function ApprovalPanel({ onApprovalResolved }: ApprovalPanelProps) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        const response = await fetch('/api/approvals');
        const data = await response.json();
        if (data.success) {
          setApprovals(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch approvals:', err);
      }
    };
    loadApprovals();
    const interval = setInterval(loadApprovals, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = useCallback(async (approvalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        onApprovalResolved?.(approvalId, 'APPROVED');
      } else {
        setError(data.error?.message || 'Failed to approve');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [onApprovalResolved]);

  const handleReject = useCallback(async (approvalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        onApprovalResolved?.(approvalId, 'REJECTED');
      } else {
        setError(data.error?.message || 'Failed to reject');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [onApprovalResolved]);

  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-500">Pending Approvals</h3>
      {error && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm font-medium text-amber-300">
              {approval.toolName}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(approval.createdAt).toLocaleTimeString()}
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-2">{approval.description}</p>
          <p className="text-xs text-slate-500 mb-3">{approval.riskLevel}</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(approval.id)}
              disabled={loading}
              className="flex-1 py-2 px-3 rounded bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(approval.id)}
              disabled={loading}
              className="flex-1 py-2 px-3 rounded bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
