import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync(':memory:')

// Execute SQL statements from strings

db.exec(`
    CREATE TABLE bki (
        inn                    TEXT PRIMARY KEY,
        report_status          TEXT NOT NULL,  
        active_loans_count     INTEGER,
        total_debt             REAL,
        monthly_payment        REAL,
        delinquencies_12m_count INTEGER,
        max_delinquency_days   INTEGER,
        has_default            INTEGER NOT NULL DEFAULT 0,
        report_date            TEXT

    );

    INSERT INTO bki
    (inn, report_status, active_loans_count, total_debt, monthly_payment,
    delinquencies_12m_count, max_delinquency_days, has_default, report_date)
    VALUES
    -- ✅ ХОРОШИЙ: один кредит, без просрочек
    ('7700000001', 'FOUND',     1,   850000.0,  28500.0, 0, 0,   0, '2026-10-20'),

    -- ❌ ПЛОХОЙ: много кредитов, крупный долг, действующий дефолт
    ('7700000002', 'FOUND',     6,  9400000.0, 410000.0, 9, 120,  1, '2026-10-21'),

    -- 🟡 СРЕДНИЙ: два кредита, одна короткая просрочка
    ('7700000003', 'FOUND',     2,  2400000.0,  95000.0, 1, 10,   0, '2026-10-19'),

    -- ⚠️ НЕДОСТАТОК ДАННЫХ: отчёт не получен, все показатели неизвестны
    ('7700000004', 'NOT_FOUND', NULL,    NULL,      NULL, NULL, NULL, 0, NULL);
`)

db.prepare(`
    INSERT INTO bki (
        inn, report_status, active_loans_count, total_debt,
        monthly_payment, delinquencies_12m_count,
        max_delinquency_days, has_default, report_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('7700000099', 'FOUND', 1, 1000000, 80000, 0, 0, 0, '2026-10-20')

export default db
