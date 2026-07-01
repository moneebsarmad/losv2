# League of Stars Web

Next.js App Router frontend for League of Stars V2.

## Key Routes

- `/` - login
- `/dashboard` - role-aware landing page
- `/dashboard/recognize` - staff/admin recognition flow
- `/dashboard/my-growth` - student dashboard
- `/dashboard/parent` - parent child view
- `/dashboard/houses` - house standings
- `/dashboard/admin/reports` - Tarbiyah reporting
- `/dashboard/admin/audit` - audit trail

## Local Env

Next loads local env from this app directory during `next dev` and `next build`.

```bash
cp ../../.env.local .env.local
```

The file is ignored by git.
