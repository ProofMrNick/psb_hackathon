import db from './db.js'
import bcrypt from 'bcryptjs'

export default function fill_db() {
    if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0) return
    ///registering accounts for  an employee and ML
    const hashed_employee_password = bcrypt.hashSync(process.env.EMPLOYEE_PASSWORD, 8)
    const hashed_ml_password = bcrypt.hashSync(process.env.ML_PASSWORD, 8)
    db.exec(`
        INSERT INTO users (username, password, role) VALUES
        ('employee', '${hashed_employee_password}', 'EMPLOYEE'),
        ('ml', '${hashed_ml_password}', 'EMPLOYEE');

        INSERT INTO user_info (user_id, email, name, risk_score, company_name) VALUES
        (${1}, 'manager@alfa-bank.local', 'Смирнова Ольга Викторовна', '-1', '-1'),
        (${2}, 'ml@alfa-bank.local', 'Исскуственный Интелект', '-1', '-1');;
    `)
    

    // Синтетическая продуктовая линейка для малого и микробизнеса.
    db.exec(`
        INSERT INTO loans (name, interest_rate, duration, min_amount, max_amount) VALUES
        ('Кредит на оборотные средства', 16.9, 36, 100000, 10000000),
        ('Инвестиционный кредит', 15.5, 120, 1000000, 50000000),
        ('Кредит на оборудование', 15.9, 60, 300000, 20000000),
        ('Возобновляемая кредитная линия', 17.5, 24, 100000, 15000000)
    `)

    db.prepare(`
        INSERT INTO registry_internal (
            inn, has_account, account_opened_date, avg_monthly_inflow,
            avg_monthly_outflow, acquiring_monthly_volume, blocked_115fz,
            previous_products_closed_well, snapshot_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('7700000099', 1, '2020-01-10', 5000000, 3800000, 1000000, 0, 1, '2026-10-20')

    db.exec(`
        INSERT INTO registry_internal
        (inn, has_account, account_opened_date, avg_monthly_inflow, avg_monthly_outflow,
        acquiring_monthly_volume, blocked_115fz, previous_products_closed_well, snapshot_date)
        VALUES
        -- ХОРОШИЙ: давно с нами, обороты растут, нет блокировок, кредиты гасил
        ('7700000001', 1, '2017-03-14', 4200000.0, 3100000.0, 1250000.0, 0, 1, '2026-10-26'),

        --  ПЛОХОЙ: оттоки больше поступлений, блокировка по 115-ФЗ, старые продукты провалены
        ('7700000002', 1, '2022-11-02',  180000.0,  620000.0,       0.0, 1, 0, '2026-10-26'),

        -- СРЕДНИЙ: обычный оборот, небольшая просадка, старые кредиты закрыл
        ('7700000003', 1, '2021-06-01', 1600000.0, 1450000.0,  320000.0, 0, 1, '2026-10-26'),

        -- НЕДОСТАТОК ДАННЫХ: счёт не открыт, истории нет
        ('7700000004', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL);
    `)
}
