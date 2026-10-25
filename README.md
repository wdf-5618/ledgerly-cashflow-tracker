# Ledgerly — Cash Flow Tracker

Ledgerly is a small browser app for recording income and expenses and reviewing monthly cash flow. It uses HTML, CSS, and vanilla JavaScript, with no package installation required.

## Features
- Record income or expense with description, amount in MMK, date, category, and optional notes.
- Edit and delete transactions.
- Monthly totals for income, expenses, net cash flow, and transaction count.
- Change the reporting month.
- Search transactions and filter by type.
- Sort by date or amount.
- Compare income and expenses visually.
- Export the selected month to CSV.
- Save entries in browser `localStorage`.
- Load fictional sample entries on the first visit.

## Run locally
Open `index.html` directly, or start a server from the repository root:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000/](http://localhost:8000/).

## Files
- `index.html` — form, monthly summaries, filters, and transaction list.
- `styles.css` — responsive layout, income/expense colors, and focus styles.
- `app.js` — validation, CRUD operations, local persistence, monthly aggregation, filtering, sorting, and CSV export.

## Implementation choices
- Store amounts as positive numbers; transaction type determines whether they contribute to income or expenses.
- Derive totals from the selected month's transaction records rather than maintaining duplicate counters.
- Store date-only strings to avoid timezone shifts.
- Quote CSV fields and escape embedded quotation marks.
- Render user-entered values as text rather than HTML.
- Report storage failures honestly instead of claiming the data has been saved.

## Limitations
This is a learning prototype, not a financial service. It is not connected to a bank, does not sync between devices, and includes no accounts, shared database, recurring transactions, invoices, or financial advice. Data remains in the current browser profile; export a CSV copy if you need a backup.

## Future improvements
Automated tests, recurring transactions, custom categories, CSV import, detailed reports, and a backend with user accounts and appropriate access controls.
