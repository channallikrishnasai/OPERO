import { ActionLogEntry } from '@/types/dashboard';

interface RecentActivityProps {
  actions: ActionLogEntry[];
}

function getActionIcon(action: string) {
  if (action.includes('ORDER')) return '📦';
  if (action.includes('INCIDENT')) return '🔥';
  if (action.includes('INVENTORY')) return '⚠️';
  if (action.includes('MACHINE')) return '🔧';
  if (action.includes('TASK')) return '📋';
  return '📌';
}

function getActionLabel(action: string) {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RecentActivity({ actions }: RecentActivityProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-purple-400">📝</span>
        Recent Activity
      </h2>
      <div className="space-y-2">
        {actions.length === 0 ? (
          <p className="text-slate-500 text-sm">No recent activity</p>
        ) : (
          actions.map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0"
            >
              <span className="text-sm">{getActionIcon(action.action)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate">
                  {getActionLabel(action.action)}
                </p>
                <p className="text-xs text-slate-500">
                  {action.entityType} - {new Date(action.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
