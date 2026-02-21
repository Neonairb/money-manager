# Money Manager — Agent Plan

This repository contains the **Money Manager** app.
- Backend: NestJS + Prisma + PostgreSQL
- Mobile: Flutter

Everything must be implemented and documented in **English**.

---

## Repo layout (recommended)
- `/` → NestJS API
- `money_manager_fl/` → Flutter app
- `docker-compose.yml` → Postgres for local dev

---

## Global Constraints
- Do NOT break API compatibility without updating the mobile app.
- Never store money as float; use Prisma `Decimal`.
- All balance-changing operations must use DB transactions.
- Validation on backend is mandatory (DTO + class-validator).
- UI must follow the reference style in `expenses.pdf`.

---

## Agent Roles

### 1) Product + UX Agent (DesignAgent)
Responsibilities:
- Translate requirements into screens, components, and user flows.
- Ensure the app matches the dark UI style (tabs, donut charts, cards, FAB).
- Define empty states, loading states, and error states.

Deliverables:
- Screen map + navigation structure
- UI component checklist (buttons, cards, lists, selectors)
- UX rules for range navigation (Day/Week/Month/Year/Custom)

### 2) Backend Agent (BackendAgent)
Responsibilities:
- Implement NestJS modules, DTO validation, auth, and Prisma schema.
- Implement robust money logic:
  - account balances
  - transactions (expense/income)
  - transfers
  - edits/deletes with compensation logic
- Implement range filtering and grouping for lists.
- Implement receipt upload endpoint (local storage MVP).

Deliverables:
- Prisma schema + migrations
- Modules: auth, icons, accounts, categories, transactions, transfers, uploads
- Consistent response format `{success,data}` / `{success,error}`
- OpenAPI/Swagger docs (optional but recommended)

### 3) Mobile Agent (MobileAgent)
Responsibilities:
- Implement Flutter app with the reference UI style.
- Implement auth, token storage, and API client.
- Build screens:
  - Home (charts + list)
  - Add Transaction
  - Accounts
  - Transfers
  - Categories
- Implement period filtering UI + navigation arrows.
- Implement receipt photo picking and upload.

Deliverables:
- App theme + reusable widgets
- Screens + navigation
- API integration + models + error handling

### 4) DevOps Agent (DevOpsAgent)
Responsibilities:
- Ensure local dev works end-to-end.
- Provide Docker Compose for Postgres and optional pgAdmin.
- Provide environment templates and scripts.

Deliverables:
- `docker-compose.yml`
- `.env.example`
- README dev instructions

### 5) QA Agent (QAAgent)
Responsibilities:
- Define test strategy and critical test cases.
- Validate money correctness (no drift) across create/edit/delete flows.
- Validate filters (day/week/month/year/custom) and navigation.

Deliverables:
- Backend unit tests (services) for balance updates
- E2E test plan for critical flows
- Manual QA checklist for mobile UI

---

## Implementation Sequence (recommended)
1. DevOps: Postgres compose + env templates
2. Backend: Auth + Prisma schema + seed icons
3. Backend: Accounts + Categories
4. Backend: Transactions + range filtering + grouping
5. Backend: Transfers + history + range filtering
6. Backend: Uploads (receipt)
7. Mobile: Theme + navigation shell
8. Mobile: Auth screens
9. Mobile: Home charts + transactions list + filters
10. Mobile: Add transaction + upload receipt
11. Mobile: Accounts + Transfers + Categories screens
12. QA: run test matrix and fix issues

---

## Range Filtering Rules
Supported ranges:
- DAY: anchored by a date (default: today)
- WEEK: anchored by a date; show Monday–Sunday (or locale setting)
- MONTH: anchored by a date
- YEAR: anchored by a date
- CUSTOM: from/to

Navigation:
- Day: previous/next day
- Week: previous/next week
- Month: previous/next month
- Year: previous/next year
- Custom: no arrows (user picks dates)

---

## Definition of Done
- Backend and mobile compile and run locally.
- Auth works (register/login/me).
- Accounts/categories/transactions/transfers fully functional.
- Balances always match transaction history.
- UI matches the reference screenshots.
