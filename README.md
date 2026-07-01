# League of Stars V2

League of Stars V2 is BHA's internal house culture and 3R formation portal. The app keeps the house system as the social engine while making recognition behaviour-specific, tied to the 3Rs, connected to BHA domains, and visible to students/parents only when staff choose that visibility.

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth, Postgres, RLS
- TypeScript
- CSS modules via global design system classes

## App Structure

- `apps/web` - Next.js application
- `supabase/migrations` - additive schema/RLS migrations for LOS V2
- `supabase/seed` - reference seed SQL for 3Rs, domains, and point values
- `01_PRD.md` - product requirements
- `02_BLUEPRINT.md` - technical blueprint
- `03_IMPLEMENTATION_PLAN.md` - implementation plan
- `04_TODO.md` - execution checklist

## Local Setup

Install dependencies:

```bash
npm install
```

Create local env files:

```bash
cp .env.example .env.local
cp .env.local apps/web/.env.local
```

Set these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_SERVICE_ROLE_SECRET=
NEXT_DB_PASSWORD=
```

Run checks:

```bash
npm run typecheck
npm run build
```

Start development:

```bash
npm run dev
```

## Implemented MVP Surfaces

- Secure login page
- Role-based dashboard routing
- Staff dashboard
- Fast recognition posting flow
- Student search
- Student My Growth dashboard
- Parent child-growth dashboard
- House standings page
- Admin/Tarbiyah overview dashboard
- Missed-students view
- High-volume student view
- CSV export route
- Audit trail route/page
- Supabase schema, RLS, role/permission seed, 3R/domain/point-value seed

## Database Deployment Note

The migrations are designed to be additive, but they enable RLS and manage policies on common table names such as `profiles` and `students`. Apply them only to the intended LOS V2 Supabase project or after confirming the existing database can safely adopt these policies.
