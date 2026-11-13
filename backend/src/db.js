import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync(':memory:')

db.exec(`
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'CLIENT' -- CLIENT, EMPLOYEE
    )
`)

db.exec(`
    CREATE TABLE applications (

        global_id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id INTEGER,
        user_id INTEGER,
        inn TEXT,
        loan_id INTEGER,

        loan_sum INTEGER,
        loan_interest REAL,
        loan_duration INTEGER,
        purpose TEXT DEFAULT 'CURRENT_ACTIVITY',

        time_of_application DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'DRAFT',
        approved_amount REAL,
        approved_term_months INTEGER,
        approved_rate REAL,
        missing_fields TEXT DEFAULT '[]',
        decision_reason TEXT,
        decision_comment TEXT,
        

        FOREIGN KEY(inn) REFERENCES user_info(inn), 
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(loan_id) REFERENCES loans(id)
        ) 
`)
db.exec(`UPDATE sqlite_sequence SET seq = 432889 WHERE name = 'applications'`)

db.exec(`
    CREATE TABLE loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        interest_rate REAL NOT NULL,
        duration INTEGER NOT NULL,   -- months
        min_amount INTEGER NOT NULL,  
        max_amount INTEGER NOT NULL
    )    
`)

db.exec(`
    CREATE TABLE user_info (
    user_id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    
    risk_score INTEGER,
    risk_score_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    inn TEXT UNIQUE,
    company_name TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`)

db.exec(`
    CREATE TABLE applications_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    application_global_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    metadata TEXT DEFAULT '{}',
    new_status TEXT
    )
`)
db.exec(`
    CREATE TRIGGER log_application_created
    AFTER INSERT ON applications
    FOR EACH ROW
    BEGIN
        INSERT INTO applications_logs (user_id, application_global_id, new_status, timestamp)
        VALUES (NEW.user_id, NEW.global_id, NEW.status, CURRENT_TIMESTAMP);
    END;
`)
db.exec(`
    CREATE TRIGGER log_application_status_change
    AFTER UPDATE OF status ON applications
    FOR EACH ROW
    WHEN OLD.status != NEW.status
    BEGIN
        INSERT INTO applications_logs (user_id, application_global_id, new_status, timestamp)
        VALUES (OLD.user_id, OLD.global_id, NEW.status, CURRENT_TIMESTAMP);
    END;
`)

db.exec(`
    CREATE TABLE recommended_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,

    loan_sum INTEGER,
    loan_interest REAL,
    loan_duration INTEGER,

    approval_probability INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`)

db.exec(`
    CREATE TABLE scoring_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inn TEXT,
    application_id INTEGER NOT NULL,
    score INTEGER,
    risk_level TEXT,
    default_probability REAL,
    model_version TEXT,
    factors TEXT,
    reason_codes TEXT,
    trigger TEXT,        -- SUBMIT | CLARIFY | ENRICHMENT | PRE_DECISION
    version INTEGER,     -- 1, 2, 3...
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications (global_id)
    )
`)

db.exec(`
    CREATE TABLE IF NOT EXISTS registry_internal (
    inn                          TEXT PRIMARY KEY,
    has_account                  INTEGER NOT NULL,
    account_opened_date          TEXT,
    avg_monthly_inflow           REAL,
    avg_monthly_outflow          REAL,
    acquiring_monthly_volume     REAL,
    blocked_115fz                INTEGER NOT NULL DEFAULT 0,
    previous_products_closed_well INTEGER,
    snapshot_date                TEXT
)
`)
export default db
