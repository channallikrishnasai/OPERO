import { ActionLogEntry } from '@/types/dashboard';

interface OperatorActivityProps {
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

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-400';
    case 'IN_PROGRESS':
      return 'text-purple-400';
    case 'FAILED':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}

export function OperatorActivity({ actions }: OperatorActivityProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-cyan-400">🤖</span>
        Operator Activity
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-3 px-2 text-slate-500 font-medium">Action</th>
              <th className="text-left py-3 px-2 text-slate-500 font-medium">Entity</th>
              <th className="text-left py-3 px-2 text-slate-500 font-medium">Status</th>
              <th className="text-right py-3 px-2 text-slate-500 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span>{getActionIcon(action.action)}</span>
                    <span className="text-slate-300">{getActionLabel(action.action)}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-slate-500">{action.entityType}</td>
                <td className="py-3 px-2">
                  <span className={`font-medium ${getStatusColor(action.status)}`}>
                    {action.status}
                  </span>
                </td>
                <td className="py-3 px-2 text-right text-slate-500">
                  {new Date(action.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
