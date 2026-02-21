# Money Manager

Money Manager is a personal finance app focused on **accounts**, **transactions** (expenses & income), and **transfers**, with a clean dark UI inspired by the reference screenshots (see `expenses.pdf`).

All UI copy, API messages, code comments, and documentation MUST be in **English**.

---

## 1) Product Goals

### Core features (MVP)
- Create **Accounts** that represent where the money is (Cash, Debit, Credit, Wallets, etc.).
- Create **Expense** and **Income** transactions:
  - Select the **Account** used
  - Enter **Amount**
  - Select **Category**
  - Pick **Transaction date**
  - Optional **Comment**
  - Optional **Receipt photo**
- Create **Transfers** between accounts:
  - From account
  - To account
  - Amount
  - Date
  - Optional comment
  - Store every transfer in a **transfer history**
- Create and manage **Categories** (Expense & Income separated).
- Built-in **Icon library** to assign icons to accounts and categories (seeded in DB).
- Visualize transaction history by **Day / Week / Month / Year / Custom range**.
  - The UI must show the current range label (e.g., `Feb 15 – Feb 21`).
  - Provide **left/right arrows** to navigate to previous/next range for Day/Week/Month/Year.
  - For custom range, allow user to choose start/end dates.

### Non-goals (for now)
- Multi-currency, investments, recurring bills, cloud sync, ads, etc.
- Advanced budgeting rules (can be added later).

---

## 2) Visual Design Requirements (Flutter)

Use the UI style shown in `expenses.pdf`:
- Dark theme, high contrast, rounded cards.
- Main section tabs: **EXPENSES** and **INCOME**.
- Secondary period selector: **Day / Week / Month / Year / Period** (Period = custom range).
- A **donut chart** for the selected range, showing total and distribution by categories.
- A ranked list of categories under the chart with:
  - Icon + name
  - Percent share
  - Total amount
- Floating Action Button (FAB) with **+** for adding transactions.
- **Transactions** view:
  - Grouped by date (e.g., “February 20, 2026”)
  - Each item shows category + account + optional note and amount
- **Accounts** screen:
  - Total balance at top
  - List of accounts with icon and balance
  - Buttons: “Transfer history” and “New transfer”
- **Transfers** screen:
  - Filter by Day/Week/Month/Year/Period
  - List of transfers with + / - amount per entry
- **Create transfer** form:
  - From account, To account, Amount, Date, Comment
- **Categories** screen:
  - Two tabs: EXPENSES / INCOME
  - Grid of category icons
  - “Create” tile/button
- Optional Navigation Drawer / Side menu similar to the screenshots.

Implementation notes:
- Use `Material 3` with a custom dark color scheme.
- Use a chart library such as `fl_chart` for donut charts.
- Ensure mobile-first UX, smooth transitions, and consistent spacing.

---

## 3) Architecture

### Backend
- NestJS (TypeScript)
- Prisma ORM
- PostgreSQL (Docker) via `DATABASE_URL` in `.env`
- REST API, JWT auth

### Mobile (Frontend)
- Flutter (Dart)
- State management: use a simple, maintainable approach (e.g., Riverpod or Bloc).
- Token storage: use secure storage (e.g., `flutter_secure_storage`).

### Repository layout (recommended)
- `backend/` → NestJS app
- `mobile/` → Flutter app
- `docker-compose.yml` → Postgres

---

## 4) Backend Guidelines (NestJS + Prisma)

### Module structure
Keep a clean modular structure:

- `src/modules/<module-name>/`
  - `<module-name>.module.ts`
  - `<module-name>.controller.ts`
  - `<module-name>.service.ts`
  - `dto/`
  - `entities/` (optional)

Always inject `PrismaService` (never instantiate `PrismaClient` directly).

### Auth rules
- Use JWT with `Authorization: Bearer <token>`.
- All routes are protected by a global auth guard unless explicitly marked public.
- Keep login/register public.

### API Response format
Success:
```json
{ "success": true, "data": {} }
```

Error:
```json
{ "success": false, "error": "ERROR_CODE" }
```

Use standard HTTP status codes:
- 400 invalid input
- 401 unauthorized
- 403 forbidden
- 404 not found
- 409 conflict
- 500 server error

Error codes MUST be uppercase strings.

### Validation rules
- Use `class-validator` on all DTOs.
- Validate referenced IDs exist (accountId, categoryId, iconId).
- Prevent logically invalid operations:
  - Transfers: fromAccountId != toAccountId
  - Amount > 0
  - Account balances must remain consistent

### Prisma rules
- Use `Decimal` for money in DB (avoid float).
- Convert Decimal values to `number` for API responses.
- Avoid N+1 queries; include relations carefully.
- Keep migrations in `prisma/migrations`.

### Receipt photo uploads
- MVP approach: store receipt images locally on backend:
  - Upload endpoint returns a URL/path
  - Transactions store `receiptUrl`
- Use `multipart/form-data` for upload endpoints.

---

## 5) Data Model (Prisma) — MVP

### Entities
- User
- Icon
- Account
- Category
- Transaction
- Transfer

### Money rules
- Every Account has a `balance`.
- When an Expense is created:
  - Subtract from account balance
- When Income is created:
  - Add to account balance
- When a Transfer is created:
  - Subtract from fromAccount
  - Add to toAccount
- When editing/deleting transactions/transfers:
  - Reverse the previous effect and apply the new one (use DB transactions).

---

## 6) REST API (Proposed Endpoints)

### Auth
- `POST /auth/register`
- `POST /auth/login` (public)
- `GET /auth/me`

### Icons
- `GET /icons` (list built-in icons)
- `POST /icons/seed` (admin/dev only; optional)

### Accounts
- `POST /accounts`
- `GET /accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id` (soft delete optional)

### Categories
- `POST /categories`
- `GET /categories?type=EXPENSE|INCOME`
- `GET /categories/:id`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

### Transactions (Expense/Income)
- `POST /transactions`
- `GET /transactions`
  - Query params:
    - `type=EXPENSE|INCOME`
    - `range=DAY|WEEK|MONTH|YEAR|CUSTOM`
    - `date=YYYY-MM-DD` (anchor date for DAY/WEEK/MONTH/YEAR)
    - `from=YYYY-MM-DD&to=YYYY-MM-DD` (CUSTOM)
    - `groupBy=DATE` (grouped list for UI)
- `GET /transactions/:id`
- `PATCH /transactions/:id`
- `DELETE /transactions/:id`

### Transfers
- `POST /transfers`
- `GET /transfers`
  - Same range query params as transactions
- `GET /transfers/:id`
- `PATCH /transfers/:id`
- `DELETE /transfers/:id`

### Uploads
- `POST /uploads/receipt` (multipart)

---

## 7) Mobile App Screens (Flutter)

### Main navigation
Use bottom navigation (or drawer) with at least:
- Home (Charts + Transactions)
- Accounts
- Transfers
- Categories
- Settings (optional)

### Home (Expenses/Income)
- Tabs: EXPENSES / INCOME
- Period selector: Day/Week/Month/Year/Period
- Date-range label with navigation arrows
- Donut chart + category breakdown list
- Transactions list (grouped by day)
- FAB to add transaction

### Add Transaction
- Amount input (numeric keypad)
- Currency label (MVP: single currency, configurable later)
- Account selector
- Category selector (with grid icons + search optional)
- Date picker
- Optional comment
- Optional photo upload

### Accounts
- Total balance
- List of accounts
- Actions: New transfer, Transfer history

### Categories
- Tabs: Expense / Income
- Grid of icons
- Create category screen

---

## 8) Engineering Priorities
1. Correctness (money must never drift)
2. Security (auth, validation)
3. Data consistency (DB transactions for balance updates)
4. Performance
5. Maintainability

---

## 9) Definition of Done (MVP)
- User can register/login.
- User can create accounts/categories/icons are available.
- User can add expenses/income and balances update correctly.
- User can create transfers and balances update correctly.
- User can filter and navigate history by day/week/month/year/custom.
- UI closely matches the style in `expenses.pdf`.
