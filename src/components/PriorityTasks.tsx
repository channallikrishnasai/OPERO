import { PriorityTask } from '@/types/dashboard';

interface PriorityTasksProps {
  tasks: PriorityTask[];
}

function getPriorityBadge(priority: string) {
  const priorityClasses: Record<string, string> = {
    URGENT: 'badge-urgent',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  };
  return priorityClasses[priority] || priorityClasses.MEDIUM;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return '🔄';
    case 'PENDING':
      return '⏳';
    default:
      return '⏳';
  }
}

export function PriorityTasks({ tasks }: PriorityTasksProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-yellow-400">📋</span>
        Priority Tasks
      </h2>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">No pending tasks</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getStatusIcon(task.status)}</span>
                  <h3 className="text-sm font-medium text-slate-200 line-clamp-1">
                    {task.title}
                  </h3>
                </div>
                <span className={`badge border text-[10px] shrink-0 ${getPriorityBadge(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{task.assignedTo || 'Unassigned'}</span>
                {task.dueDate && (
                  <span>
                    Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
