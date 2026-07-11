# Luxur & Lavish Catalogue Return Management System

## Original Problem
Full-stack catalogue lending/return management app with multi-catalogue issue, auto-create customer/catalogue, customer-name workflow, PDF/Excel exports, issue slips, dashboard, reports.

## Architecture
- **Backend**: FastAPI + MongoDB (motor async), JWT auth (bcrypt), UUID-based ids, ISO datetime strings
- **Frontend**: React 19 + Tailwind + Shadcn UI, jsPDF + xlsx for exports, Recharts

## Implemented (Feb 2026)
- JWT auth (admin/admin123) with seed on startup
- CRUD: catalogues, customers, transactions (issue + return)
- Multi-catalogue issue with auto-create customer & catalogue
- Case-insensitive customer-name search across return/pending/history/global search
- Partial & full returns with inventory auto-sync
- Dashboard: 8 stat cards + 3 charts (issue/return trend + most borrowed) + recent transactions
- Transaction History with search/filter/sort + PDF/Excel/Print exports
- Pending Returns with overdue red highlighting
- Reports page (Daily Issue/Return, Monthly, Pending, Inventory, Customer) — PDF/Excel/CSV
- Issue Slip after issue with Print + Export PDF + Export Excel buttons
- Global search bar (customers/catalogues/transactions)
- **Premium luxury dark redesign**: #0D0D0D bg, warm gold #C8A96A + emerald #3FAF7D, Fraunces serif + Inter body, editorial spacing, sidebar with collapse, premium furniture-card grid for catalogues, elegant client profile cards, dark charts, luxury issue slip

## Credentials
- admin / admin123 (see /app/memory/test_credentials.md)

## Backlog
- P1: Barcode/QR support for catalogues
- P1: Bulk Excel import
- P1: Customer profile page with transaction history timeline
- P2: Audit log for every action
- P2: Role management (admin vs staff)
- P2: Backup/restore database
