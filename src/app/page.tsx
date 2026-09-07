import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatCards } from '@/components/StatCards';
import { RecentOrders } from '@/components/RecentOrders';
import { ActiveIncidents } from '@/components/ActiveIncidents';
import { PriorityTasks } from '@/components/PriorityTasks';
import { OperatorActivity } from '@/components/OperatorActivity';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const now = new Date();

  const [
    totalOrders,
    delayedOrders,
    inventoryAlerts,
    activeIncidents,
    pendingTasks,
    recentOrders,
    openIncidents,
    priorityTasks,
    recentActions,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: {
        expectedDelivery: { lt: now },
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
    }),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM "InventoryItem" WHERE quantity <= "reorderLevel"'
    ).then((result) => Number(result[0]?.count ?? 0)),
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
    prisma.task.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    prisma.incident.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { machine: true },
    }),
    prisma.task.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 5,
    }),
    prisma.actionLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    summary: {
      totalOrders,
      delayedOrders,
      inventoryAlerts,
      activeIncidents,
      pendingTasks,
    },
    recentOrders,
    openIncidents,
    priorityTasks,
    recentActions,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatCards summary={data.summary} />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RecentOrders orders={data.recentOrders} />
            <OperatorActivity actions={data.recentActions} />
          </div>
          <div className="space-y-6">
            <ActiveIncidents incidents={data.openIncidents} />
            <PriorityTasks tasks={data.priorityTasks} />
          </div>
        </div>
      </main>
    </div>
  );
}
