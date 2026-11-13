import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync(':memory:')

// Execute SQL statements from strings

db.exec(`
    CREATE TABLE fns (
        inn                TEXT PRIMARY KEY,
        ogrn               TEXT NOT NULL,
        name               TEXT NOT NULL,
        legal_form         TEXT NOT NULL,              -- 'IP' | 'OOO'
        registration_date  TEXT NOT NULL,              -- ISO: '2018-10-17'
        status             TEXT NOT NULL,              -- 'ACTIVE' | 'LIQUIDATION'
        okved_main         TEXT,
        okved_additional   TEXT,                       -- JSON-массив строк
        tax_regime         TEXT,
        msp_category       TEXT,                       -- 'MICRO' | 'SMALL'
        msp_registry_date  TEXT,
        edo_participant    INTEGER NOT NULL DEFAULT 0, -- 0/1
        head_name          TEXT,                       -- для ООО
        head_position      TEXT

    );

    INSERT INTO fns
    (inn, ogrn, name, legal_form, registration_date, status,
    okved_main, okved_additional, tax_regime, msp_category, msp_registry_date,
    edo_participant, head_name, head_position)
    VALUES
    -- ХОРОШИЙ: старое ООО, активный МСП, УСН, ЭДО подключено
    ('7700000001', '1177746000011', 'ООО "Вектор"', 'OOO', '2017-03-14', 'ACTIVE',
    '46.90', '["46.49","52.10"]', 'USN', 'SMALL', '2018-04-10',
    1, 'Иванов Иван Иванович', 'Генеральный директор'),

    --  ПЛОХОЙ: молодое ООО, ОСНО, не входит в реестр МСП
    ('7700000002', '1227746000022', 'ООО "Вектор-Трейд"', 'OOO', '2022-11-02', 'ACTIVE',
    '46.90', NULL, 'OSNO', NULL, NULL,
    0, 'Петров Пётр Петрович', 'Генеральный директор'),

    --  СРЕДНИЙ: ИП, УСН, микропредприятие, но ЭДО нет
    ('7700000003', '3217746000033', 'ИП Сидоров А.М.', 'IP', '2021-06-01', 'ACTIVE',
    '62.01', '["63.11"]', 'USN', 'MICRO', '2021-07-05',
    0, 'Сидоров Алексей Михайлович', 'Индивидуальный предприниматель'),

    --  НЕДОСТАТОК ДАННЫХ: есть только обязательные поля из ЕГРЮЛ, остальное NULL
    ('7700000004', '1267746000044', 'ООО "Старт"', 'OOO', '2026-09-15', 'ACTIVE',
    NULL, NULL, NULL, NULL, NULL,
    0, NULL, NULL);
`)

db.prepare(`
    INSERT INTO fns (
        inn, ogrn, name, legal_form, registration_date, status,
        okved_main, okved_additional, tax_regime, msp_category,
        msp_registry_date, edo_participant, head_name, head_position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    '7700000099',
    '1027700000000',
    'ООО Надёжный бизнес',
    'OOO',
    '2018-05-10',
    'ACTIVE',
    '62.01',
    JSON.stringify(['62.02', '63.11']),
    'USN',
    'SMALL',
    '2018-08-01',
    1,
    'Иванов Иван Иванович',
    'Генеральный директор',
)

export default db
