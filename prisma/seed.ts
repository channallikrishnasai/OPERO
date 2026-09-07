import { PrismaClient, OrderStatus, OrderPriority, IncidentSeverity, IncidentStatus, TaskPriority, TaskStatus, MachineStatus, ActionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Acme Operations database...');

  // Clear existing data
  await prisma.actionLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  // Create 10 Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Acme Manufacturing Corp',
        email: 'orders@acmemfg.com',
        phone: '+1-555-101-0001',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Global Logistics Partners',
        email: 'ops@globallogistics.com',
        phone: '+1-555-101-0002',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Pacific Supply Chain',
        email: 'purchasing@pacsupply.com',
        phone: '+1-555-101-0003',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Industrial Solutions LLC',
        email: 'buy@indsolutions.com',
        phone: '+1-555-101-0004',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Midwest Equipment Co',
        email: 'info@mwequip.com',
        phone: '+1-555-101-0005',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Summit Manufacturing Inc',
        email: 'orders@summitmfg.com',
        phone: '+1-555-101-0006',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Coastal Distribution Center',
        email: 'procurement@coastaldist.com',
        phone: '+1-555-101-0007',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Northern Fabrication Works',
        email: 'sales@northfab.com',
        phone: '+1-555-101-0008',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Sterling Parts Supply',
        email: 'orders@sterlingparts.com',
        phone: '+1-555-101-0009',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Apex Industrial Group',
        email: 'ops@apexindustrial.com',
        phone: '+1-555-101-0010',
      },
    }),
  ]);

  console.log(`Created ${customers.length} customers`);

  // Create 15 Orders (with intentional delays and priorities)
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const orders = await Promise.all([
    // Delayed orders (past expected delivery)
    prisma.order.create({
      data: {
        customerId: customers[0].id,
        status: OrderStatus.PROCESSING,
        priority: OrderPriority.URGENT,
        totalAmount: 12450.0,
        expectedDelivery: threeDaysAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[1].id,
        status: OrderStatus.SHIPPED,
        priority: OrderPriority.HIGH,
        totalAmount: 8750.5,
        expectedDelivery: fiveDaysAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[2].id,
        status: OrderStatus.PENDING,
        priority: OrderPriority.HIGH,
        totalAmount: 23100.0,
        expectedDelivery: oneWeekAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    // Active orders
    prisma.order.create({
      data: {
        customerId: customers[3].id,
        status: OrderStatus.PROCESSING,
        priority: OrderPriority.MEDIUM,
        totalAmount: 5430.25,
        expectedDelivery: oneWeekFromNow,
        createdAt: oneWeekAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[4].id,
        status: OrderStatus.PENDING,
        priority: OrderPriority.MEDIUM,
        totalAmount: 9875.0,
        expectedDelivery: twoWeeksFromNow,
        createdAt: oneWeekAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[5].id,
        status: OrderStatus.PROCESSING,
        priority: OrderPriority.LOW,
        totalAmount: 3200.75,
        expectedDelivery: twoWeeksFromNow,
        createdAt: oneWeekAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[0].id,
        status: OrderStatus.SHIPPED,
        priority: OrderPriority.MEDIUM,
        totalAmount: 15600.0,
        expectedDelivery: oneWeekFromNow,
        createdAt: oneWeekAgo,
      },
    }),
    // Completed orders
    prisma.order.create({
      data: {
        customerId: customers[6].id,
        status: OrderStatus.DELIVERED,
        priority: OrderPriority.MEDIUM,
        totalAmount: 7800.0,
        expectedDelivery: oneWeekAgo,
        actualDelivery: fiveDaysAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[7].id,
        status: OrderStatus.DELIVERED,
        priority: OrderPriority.LOW,
        totalAmount: 4560.3,
        expectedDelivery: fiveDaysAgo,
        actualDelivery: threeDaysAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[8].id,
        status: OrderStatus.DELIVERED,
        priority: OrderPriority.HIGH,
        totalAmount: 18900.0,
        expectedDelivery: oneWeekAgo,
        actualDelivery: oneWeekAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    // More orders
    prisma.order.create({
      data: {
        customerId: customers[9].id,
        status: OrderStatus.PENDING,
        priority: OrderPriority.URGENT,
        totalAmount: 31200.0,
        expectedDelivery: oneWeekFromNow,
        createdAt: threeDaysAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[3].id,
        status: OrderStatus.CANCELLED,
        priority: OrderPriority.LOW,
        totalAmount: 2100.0,
        expectedDelivery: oneWeekAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[1].id,
        status: OrderStatus.PROCESSING,
        priority: OrderPriority.MEDIUM,
        totalAmount: 6750.5,
        expectedDelivery: twoWeeksFromNow,
        createdAt: threeDaysAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[5].id,
        status: OrderStatus.SHIPPED,
        priority: OrderPriority.MEDIUM,
        totalAmount: 11400.0,
        expectedDelivery: oneWeekFromNow,
        createdAt: oneWeekAgo,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[2].id,
        status: OrderStatus.RETURNED,
        priority: OrderPriority.LOW,
        totalAmount: 3850.0,
        expectedDelivery: oneWeekAgo,
        actualDelivery: fiveDaysAgo,
        createdAt: twoWeeksAgo,
      },
    }),
  ]);

  console.log(`Created ${orders.length} orders`);

  // Create 8 Inventory Items (with some shortages)
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        name: 'Hydraulic Pump Assembly',
        sku: 'HP-4010-A',
        quantity: 24,
        reorderLevel: 15,
        location: 'Warehouse A - Bay 3',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Pneumatic Valve Kit',
        sku: 'PV-2020-B',
        quantity: 5,
        reorderLevel: 20,
        location: 'Warehouse A - Bay 5',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Industrial Bearing Set',
        sku: 'IB-6015-C',
        quantity: 150,
        reorderLevel: 50,
        location: 'Warehouse B - Rack 12',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Control Board Module',
        sku: 'CB-3030-D',
        quantity: 8,
        reorderLevel: 10,
        location: 'Warehouse B - Rack 8',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Steel Mounting Bracket',
        sku: 'SM-1040-E',
        quantity: 200,
        reorderLevel: 75,
        location: 'Warehouse A - Bay 1',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Thermal Sensor Unit',
        sku: 'TS-5050-F',
        quantity: 3,
        reorderLevel: 12,
        location: 'Warehouse C - Shelf 4',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Drive Belt Assembly',
        sku: 'DB-7060-G',
        quantity: 45,
        reorderLevel: 30,
        location: 'Warehouse A - Bay 7',
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Electrical Connector Pack',
        sku: 'EC-8070-H',
        quantity: 300,
        reorderLevel: 100,
        location: 'Warehouse C - Shelf 1',
      },
    }),
  ]);

  console.log(`Created ${inventoryItems.length} inventory items`);

  // Create 5 Machines
  const machines = await Promise.all([
    prisma.machine.create({
      data: {
        name: 'CNC Mill #1',
        location: 'Production Floor - Zone A',
        status: MachineStatus.OPERATIONAL,
        lastMaintenance: oneWeekAgo,
      },
    }),
    prisma.machine.create({
      data: {
        name: 'Hydraulic Press #2',
        location: 'Production Floor - Zone B',
        status: MachineStatus.DOWN,
        lastMaintenance: twoWeeksAgo,
      },
    }),
    prisma.machine.create({
      data: {
        name: 'Welding Station #3',
        location: 'Production Floor - Zone C',
        status: MachineStatus.MAINTENANCE,
        lastMaintenance: threeDaysAgo,
      },
    }),
    prisma.machine.create({
      data: {
        name: 'Assembly Robot #4',
        location: 'Production Floor - Zone A',
        status: MachineStatus.OPERATIONAL,
        lastMaintenance: fiveDaysAgo,
      },
    }),
    prisma.machine.create({
      data: {
        name: 'Quality Inspection Scanner #5',
        location: 'Quality Lab',
        status: MachineStatus.OPERATIONAL,
        lastMaintenance: oneWeekAgo,
      },
    }),
  ]);

  console.log(`Created ${machines.length} machines`);

  // Create 5 Incidents (some open, some resolved, one critical)
  const incidents = await Promise.all([
    prisma.incident.create({
      data: {
        machineId: machines[1].id,
        title: 'Hydraulic Press Overheating',
        description: 'Hydraulic Press #2 showing temperature readings above normal operating range. Auto-shutdown triggered at 14:32.',
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
      },
    }),
    prisma.incident.create({
      data: {
        machineId: machines[2].id,
        title: 'Welding Station Calibration Drift',
        description: 'Welding Station #3 calibration drift detected during routine quality check. Scheduled for maintenance.',
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.IN_PROGRESS,
        createdAt: threeDaysAgo,
      },
    }),
    prisma.incident.create({
      data: {
        machineId: machines[0].id,
        title: 'Minor Coolant Leak on CNC Mill',
        description: 'Small coolant leak detected from hose connection on CNC Mill #1. Repaired during shift change.',
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.RESOLVED,
        createdAt: fiveDaysAgo,
        resolvedAt: threeDaysAgo,
      },
    }),
    prisma.incident.create({
      data: {
        machineId: machines[3].id,
        title: 'Assembly Robot Positioning Error',
        description: 'Assembly Robot #4 reported intermittent positioning error. Recalibration performed successfully.',
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.RESOLVED,
        createdAt: oneWeekAgo,
        resolvedAt: fiveDaysAgo,
      },
    }),
    prisma.incident.create({
      data: {
        machineId: machines[4].id,
        title: 'Inspection Scanner Software Glitch',
        description: 'Quality Inspection Scanner #5 software freeze during batch scan. Restart resolved issue.',
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.CLOSED,
        createdAt: twoWeeksAgo,
        resolvedAt: oneWeekAgo,
      },
    }),
  ]);

  console.log(`Created ${incidents.length} incidents`);

  // Create 5 Tasks (some pending, some completed)
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Expedite URGENT order #1 for Acme Manufacturing',
        description: 'Priority customer order is 3 days overdue. Contact supplier and arrange expedited shipping.',
        priority: TaskPriority.URGENT,
        status: TaskStatus.PENDING,
        assignedTo: 'operations-team',
        dueDate: now,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Order replacement hydraulic hose for Press #2',
        description: 'Critical spare part needed to resolve machine downtime incident.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        assignedTo: 'maintenance-team',
        dueDate: oneWeekFromNow,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Reorder Pneumatic Valve Kit (SKU: PV-2020-B)',
        description: 'Inventory at 5 units, below reorder level of 20. Place PO with primary supplier.',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        assignedTo: 'procurement-team',
        dueDate: threeDaysAgo,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Complete monthly safety inspection report',
        description: 'Monthly facility safety inspection report due to regulatory compliance.',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.COMPLETED,
        assignedTo: 'safety-team',
        dueDate: fiveDaysAgo,
        createdAt: twoWeeksAgo,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Schedule Preventive Maintenance for CNC Mill #1',
        description: 'Schedule next PM cycle for CNC Mill #1 based on operating hours.',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
        assignedTo: 'maintenance-team',
        dueDate: twoWeeksFromNow,
      },
    }),
  ]);

  console.log(`Created ${tasks.length} tasks`);

  // Create some ActionLogs
  const actionLogs = await Promise.all([
    prisma.actionLog.create({
      data: {
        action: 'ORDER_ESCALATED',
        entityType: 'Order',
        entityId: orders[0].id,
        status: ActionStatus.COMPLETED,
        details: { reason: 'Delivery overdue by 3 days', priority: 'URGENT' },
        createdAt: now,
      },
    }),
    prisma.actionLog.create({
      data: {
        action: 'INCIDENT_OPENED',
        entityType: 'Incident',
        entityId: incidents[0].id,
        status: ActionStatus.COMPLETED,
        details: { severity: 'CRITICAL', autoShutdown: true },
        createdAt: now,
      },
    }),
    prisma.actionLog.create({
      data: {
        action: 'INVENTORY_ALERT',
        entityType: 'InventoryItem',
        entityId: inventoryItems[1].id,
        status: ActionStatus.COMPLETED,
        details: { currentQuantity: 5, reorderLevel: 20, item: 'Pneumatic Valve Kit' },
        createdAt: oneWeekAgo,
      },
    }),
    prisma.actionLog.create({
      data: {
        action: 'MACHINE_MAINTENANCE_SCHEDULED',
        entityType: 'Machine',
        entityId: machines[2].id,
        status: ActionStatus.IN_PROGRESS,
        details: { maintenanceType: 'Calibration', scheduledBy: 'operations-team' },
        createdAt: threeDaysAgo,
      },
    }),
    prisma.actionLog.create({
      data: {
        action: 'TASK_ASSIGNED',
        entityType: 'Task',
        entityId: tasks[0].id,
        status: ActionStatus.COMPLETED,
        details: { assignedTo: 'operations-team', priority: 'URGENT' },
        createdAt: now,
      },
    }),
  ]);

  console.log(`Created ${actionLogs.length} action logs`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
