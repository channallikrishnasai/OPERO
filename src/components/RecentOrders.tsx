import { OrderWithCustomer } from '@/types/dashboard';

interface RecentOrdersProps {
  orders: OrderWithCustomer[];
}

function getStatusBadge(status: string) {
  const statusClasses: Record<string, string> = {
    PENDING: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    PROCESSING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    SHIPPED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    DELIVERED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
    RETURNED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return statusClasses[status] || statusClasses.PENDING;
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

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-slate-400">📦</span>
        Recent Orders
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-3 px-2 text-slate-500 font-medium">Customer</th>
              <th className="text-left py-3 px-2 text-slate-500 font-medium">Status</th>
              <th className="text-left py-3 px-2 text-slate-500 font-medium">Priority</th>
              <th className="text-right py-3 px-2 text-slate-500 font-medium">Amount</th>
              <th className="text-right py-3 px-2 text-slate-500 font-medium">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="py-3 px-2 text-slate-300">{order.customer.name}</td>
                <td className="py-3 px-2">
                  <span className={`badge border ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={`badge ${getPriorityBadge(order.priority)}`}>
                    {order.priority}
                  </span>
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-300">
                  ${Number(order.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-2 text-right text-slate-500">
                  {new Date(order.expectedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
