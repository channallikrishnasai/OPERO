import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
