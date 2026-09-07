import { IncidentWithMachine } from '@/types/dashboard';

interface ActiveIncidentsProps {
  incidents: IncidentWithMachine[];
}

function getSeverityBadge(severity: string) {
  const severityClasses: Record<string, string> = {
    CRITICAL: 'status-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  };
  return severityClasses[severity] || severityClasses.MEDIUM;
}

function getStatusBadge(status: string) {
  const statusClasses: Record<string, string> = {
    OPEN: 'status-open',
    IN_PROGRESS: 'status-in-progress',
  };
  return statusClasses[status] || statusClasses.OPEN;
}

export function ActiveIncidents({ incidents }: ActiveIncidentsProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-red-400">🔥</span>
        Active Incidents
      </h2>
      <div className="space-y-3">
        {incidents.length === 0 ? (
          <p className="text-slate-500 text-sm">No active incidents</p>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-slate-200 line-clamp-1">
                  {incident.title}
                </h3>
                <div className="flex gap-1 shrink-0">
                  <span className={`badge border text-[10px] ${getSeverityBadge(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span className={`badge border text-[10px] ${getStatusBadge(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
              </div>
              {incident.machine && (
                <p className="text-xs text-slate-500">
                  {incident.machine.name} - {incident.machine.location}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
