import { DashboardSummary } from '@/types/dashboard';

interface StatCardsProps {
  summary: DashboardSummary;
}

export function StatCards({ summary }: StatCardsProps) {
  const stats = [
    {
      label: 'Total Orders',
      value: summary.totalOrders,
      icon: '📦',
      color: 'text-blue-400',
    },
    {
      label: 'Delayed Orders',
      value: summary.delayedOrders,
      icon: '⏰',
      color: summary.delayedOrders > 0 ? 'text-red-400' : 'text-slate-400',
    },
    {
      label: 'Inventory Alerts',
      value: summary.inventoryAlerts,
      icon: '⚠️',
      color: summary.inventoryAlerts > 0 ? 'text-orange-400' : 'text-slate-400',
    },
    {
      label: 'Active Incidents',
      value: summary.activeIncidents,
      icon: '🔥',
      color: summary.activeIncidents > 0 ? 'text-red-400' : 'text-slate-400',
    },
    {
      label: 'Pending Tasks',
      value: summary.pendingTasks,
      icon: '📋',
      color: summary.pendingTasks > 0 ? 'text-yellow-400' : 'text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg">{stat.icon}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </span>
          </div>
          <p className="text-sm text-slate-400">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
