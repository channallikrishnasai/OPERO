# OPERO

**Voice-First AI Work Operator**

OPERO is a production-quality prototype for a voice-first AI operator that turns natural-language intent into governed, verified actions across business workflows.

## Core Loop

```
Speak → Understand → Investigate → Decide → Act → Verify → Report
```

## Current Status

**Phase 0: Project Foundation** - Complete

This phase establishes the full-stack foundation with:
- Next.js application with TypeScript and Tailwind CSS
- PostgreSQL database with Prisma ORM
- OPERO dashboard with live database values
- Synthetic data for Acme Operations organization

**Voice/AssemblyAI integration is NOT implemented yet.** This will be added in Phase 2+.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js
- **Database:** PostgreSQL, Prisma ORM
- **Package Manager:** npm

## Architecture

```
opero/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── dashboard/ # Dashboard API endpoint
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Dashboard page
│   │   └── globals.css    # Global styles
│   ├── components/        # React components
│   │   ├── DashboardHeader.tsx
│   │   ├── StatCards.tsx
│   │   ├── RecentOrders.tsx
│   │   ├── ActiveIncidents.tsx
│   │   ├── PriorityTasks.tsx
│   │   ├── RecentActivity.tsx
│   │   └── OperatorActivity.tsx
│   ├── lib/
│   │   └── prisma.ts      # Prisma client singleton
│   └── types/
│       └── dashboard.ts   # TypeScript types
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── LICENSE                # MIT License
├── README.md              # This file
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Local Setup

### Prerequisites

- Node.js 18+ 
- npm
- PostgreSQL (running locally or accessible)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd opero
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/opero?schema=public"
   ```

### Database Setup

1. Create a PostgreSQL database named `opero`

2. Run Prisma migration:
   ```bash
   npm run db:push
   ```

3. Seed the database with synthetic data:
   ```bash
   npm run db:seed
   ```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Database Schema

### Models

- **Customer** - Business customers of Acme Operations
- **Order** - Customer orders with status and priority tracking
- **InventoryItem** - Warehouse inventory with reorder levels
- **Machine** - Production floor machines and equipment
- **Incident** - Machine incidents with severity tracking
- **Task** - Operational tasks with assignment and due dates
- **ActionLog** - Audit trail for all OPERO actions

### Enums

- OrderStatus: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED
- OrderPriority: LOW, MEDIUM, HIGH, URGENT
- IncidentSeverity: LOW, MEDIUM, HIGH, CRITICAL
- IncidentStatus: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- TaskPriority: LOW, MEDIUM, HIGH, URGENT
- TaskStatus: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- MachineStatus: OPERATIONAL, MAINTENANCE, DOWN
- ActionStatus: PENDING, IN_PROGRESS, COMPLETED, FAILED

## Seed Data

The seed script creates realistic synthetic data for Acme Operations:
- 10 customers
- 15 orders (including delayed and high-priority orders)
- 8 inventory items (including items below reorder level)
- 5 machines (including machines under maintenance)
- 5 incidents (including critical and resolved incidents)
- 5 tasks (including pending and completed tasks)
- 5 action log entries

## Dashboard Features

The OPERO dashboard displays:
- **Summary Cards** - Total orders, delayed orders, inventory alerts, active incidents, pending tasks
- **Recent Orders** - Latest customer orders with status and priority
- **Active Incidents** - Open and in-progress machine incidents
- **Priority Tasks** - Pending tasks sorted by priority
- **Recent Activity** - Latest action log entries
- **Operator Activity** - Detailed audit trail

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema to database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with synthetic data
npm run db:studio    # Open Prisma Studio
```

## Planned Future Phases

- **Phase 1:** Voice integration with AssemblyAI Voice Agent API
- **Phase 2:** AI agent reasoning and tool calling
- **Phase 3:** Workflow engine and permission system
- **Phase 4:** Approval and verification systems
- **Phase 5:** Authentication and multi-tenancy

## License

MIT License - see [LICENSE](LICENSE) for details
