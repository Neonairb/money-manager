# Money Manager

Money Manager is an MVP personal finance app with:
- Backend: NestJS + Prisma + PostgreSQL
- Mobile/Desktop client: Flutter

## Stack
- API: NestJS 11, Prisma, PostgreSQL, JWT auth
- App: Flutter (Material 3 dark UI)

## Local Development

1. Start PostgreSQL:
```bash
docker compose up -d
```

2. Install backend dependencies:
```bash
npm install
```

3. Sync schema and generate Prisma client:
```bash
npm exec prisma db push
```

4. Start backend:
```bash
npm run start:dev
```

5. Install Flutter dependencies:
```bash
cd money_manager_fl
flutter pub get
```

6. Run Flutter app:
```bash
flutter run -d windows
```

## Environment Variables

Use `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expenses"
JWT_SECRET="change-me"
PORT=3000
```

## API Response Format

Success:
```json
{ "success": true, "data": {} }
```

Error:
```json
{ "success": false, "error": "ERROR_CODE" }
```

## Implemented API Modules
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /icons`
- `POST /icons/seed`
- `POST/GET/GET:id/PATCH:id/DELETE:id /accounts`
- `POST/GET/GET:id/PATCH:id/DELETE:id /categories`
- `POST/GET/GET:id/PATCH:id/DELETE:id /transactions`
- `POST/GET/GET:id/PATCH:id/DELETE:id /transfers`
- `POST /uploads/receipt`

## Notes
- Money values are stored in Prisma `Decimal`.
- Balance-changing operations use DB transactions.
- DTO validation is enabled globally.
