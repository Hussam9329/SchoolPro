# SchoolPro

SchoolPro is a Next.js school-management app configured to use PostgreSQL/Neon only through `DATABASE_URL`.

## Local run

```bash
npm install
npm run dev
```

The included `.env.production` and `.env.example` contain the PostgreSQL connection and required runtime variables. Change the initial admin password before production use.

## First login

On the first database initialization, if there are no admin users, the app creates:

- Username: `admin`
- Password: `admin1234`

Change this password immediately from the permissions page after deployment.

## Database setup

The app automatically creates the required PostgreSQL tables on first server request. You can also trigger it manually after deployment by opening:

```text
/api/setup-db
```

A copy of the schema is available at `database/schema.sql`.

## Vercel deployment

Set your Vercel token in the shell, then deploy:

```bash
export VERCEL_TOKEN="your-token"
npm install
npm run build
npm run vercel:deploy
```

For Vercel dashboard deployments, add these Environment Variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `INITIAL_ADMIN_USERNAME`
- `INITIAL_ADMIN_PASSWORD`

`VERCEL_TOKEN` is only for the CLI deployment command and is not stored in the project.
