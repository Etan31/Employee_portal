-- ============================================================
-- DELBROS HR PORTAL — DATABASE SCHEMA
-- ============================================================

-- ------------------------------------------------------------
-- REFERENCE / LOOKUP TABLES
-- ------------------------------------------------------------

CREATE TABLE companies (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,          -- "Delbros Leasing"
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id            SERIAL PRIMARY KEY,
    company_id    INT NOT NULL REFERENCES companies(id),
    name          VARCHAR(100) NOT NULL,          -- "Information Technology"
    cost_center_name VARCHAR(100),               -- "N/A" in UI
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE office_locations (
    id            SERIAL PRIMARY KEY,
    company_id    INT NOT NULL REFERENCES companies(id),
    office_area   VARCHAR(100) NOT NULL,          -- "PASCOR Drive"
    city          VARCHAR(100),                   -- "Paranaque"
    state         VARCHAR(100),                   -- "National Capital Region"
    country       VARCHAR(100) DEFAULT 'Philippines',
    full_address  TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_designations (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(100) NOT NULL           -- "Junior Programmer"
);

CREATE TABLE job_levels (
    id            SERIAL PRIMARY KEY,
    level_name    VARCHAR(100) NOT NULL           -- "Rank & File"
);

-- ------------------------------------------------------------
-- CORE EMPLOYEE TABLE
-- ------------------------------------------------------------

CREATE TABLE employees (
    id                    SERIAL PRIMARY KEY,
    employee_code         VARCHAR(50) UNIQUE NOT NULL,   -- "D-0030226-01011"
    first_name            VARCHAR(50) NOT NULL,
    middle_name           VARCHAR(50),
    last_name             VARCHAR(50) NOT NULL,
    suffix                VARCHAR(10),
    nickname              VARCHAR(50),
    profile_photo_url     TEXT,

    -- Demographics
    gender                VARCHAR(20),                   -- "Male"
    birthday              DATE,                          -- "31-05-2002"
    show_birth_year       BOOLEAN DEFAULT TRUE,
    date_of_birth_access  VARCHAR(20) DEFAULT 'Only Me', -- "Only Me" / "All"
    religion              VARCHAR(50),                   -- "Catholic"
    spouse_name           VARCHAR(100),
    solo_parent           BOOLEAN DEFAULT FALSE,
    solo_parent_id        VARCHAR(50),

    -- Employment status
    employment_status     VARCHAR(30) DEFAULT 'On Probation', -- "On Probation" / "Regular"
    probation_period_type VARCHAR(50),                        -- "Probationary (PRO)"
    employee_type         VARCHAR(30),                        -- "Direct Hire"
    work_assignment       VARCHAR(100),                       -- "N/A"
    date_of_joining       DATE NOT NULL,                      -- "09-03-2026"

    -- Organizational
    company_id            INT REFERENCES companies(id),
    department_id         INT REFERENCES departments(id),
    designation_id        INT REFERENCES job_designations(id),
    job_level_id          INT REFERENCES job_levels(id),
    office_location_id    INT REFERENCES office_locations(id),

    -- Auth / system
    work_email            VARCHAR(150) UNIQUE NOT NULL,   -- "tatumbaga@delbros.com"
    mobile_access_otp     BOOLEAN DEFAULT FALSE,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- CONTACT INFORMATION
-- ------------------------------------------------------------

CREATE TABLE employee_contacts (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    personal_email        VARCHAR(150),
    personal_mobile       VARCHAR(30),              -- "9630719746"
    office_mobile         VARCHAR(30),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- ADDRESS
-- ------------------------------------------------------------

CREATE TABLE employee_addresses (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    address_type          VARCHAR(20) DEFAULT 'Current', -- "Current" / "Permanent"
    flat_house_wing       VARCHAR(150),             -- "West Parc Drive, Alabang"
    street_locality_area  VARCHAR(150),             -- "Muntinlupa"
    landmark              VARCHAR(100),             -- "Alabang"
    country               VARCHAR(100) DEFAULT 'Philippines',
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- GOVERNMENT / PERSONAL IDENTITY NUMBERS
-- ------------------------------------------------------------

CREATE TABLE employee_identity (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    tin_number            VARCHAR(50),              -- "669080885"
    philhealth_number     VARCHAR(50),              -- "132502029014"
    pagibig_mid_number    VARCHAR(50),              -- "121356480612"
    sss_number            VARCHAR(50),              -- "3534927588"
    country_code_primary  VARCHAR(10),
    primary_mobile        VARCHAR(30),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PERSONAL DOCUMENTS (physical card copies / uploads)
-- ------------------------------------------------------------

CREATE TABLE employee_documents (
    id                        SERIAL PRIMARY KEY,
    employee_id               INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    voter_id_file             TEXT,                 -- file URL or NULL
    passbook_file             TEXT,
    philhealth_card_file      TEXT,
    pagibig_card_file         TEXT,
    sss_card_file             TEXT,
    phil_id_file              TEXT,                 -- "Pambansang Pagkakakilanlan"
    employment_documents_file TEXT,
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- RESUME
-- ------------------------------------------------------------

CREATE TABLE employee_resumes (
    id            SERIAL PRIMARY KEY,
    employee_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    file_url      TEXT NOT NULL,                    -- "a69ae248681391_T...pdf.pdf"
    uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- HR LETTERS
-- ------------------------------------------------------------

CREATE TABLE hr_letters (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_joining_file TEXT,                     -- N/A or file URL
    confirmation_file     TEXT,
    employment_related_file TEXT,
    job_description_file  TEXT,                     -- "job_description_si...aga.pdf"
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- SKILLS (tagged to employee)
-- ------------------------------------------------------------

CREATE TABLE skills (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE             -- "Word", "Excel", "Outlook" …
);

CREATE TABLE employee_skills (
    employee_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id     INT NOT NULL REFERENCES skills(id),
    PRIMARY KEY (employee_id, skill_id)
);

-- ------------------------------------------------------------
-- HOBBIES / MISC
-- ------------------------------------------------------------

CREATE TABLE employee_misc (
    id            SERIAL PRIMARY KEY,
    employee_id   INT NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    hobbies       TEXT,                             -- "Playing Badminton, Chess, and Piano"
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- EMERGENCY CONTACTS
-- ------------------------------------------------------------

CREATE TABLE emergency_contacts (
    id                SERIAL PRIMARY KEY,
    employee_id       INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contact_name      VARCHAR(100) NOT NULL,        -- "Dorothy A. Tumbaga"
    contact_number    VARCHAR(30),                  -- "9088691105"
    relation          VARCHAR(50),                  -- "Sister"
    contact_address   TEXT,                         -- "West Parc Drive, Alabang"
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- DEPENDENTS
-- ------------------------------------------------------------

CREATE TABLE dependents (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    first_name            VARCHAR(50) NOT NULL,     -- "Chona"
    last_name             VARCHAR(50),              -- "Tumbaga"
    relation              VARCHAR(50),              -- "Mother"
    date_of_birth         DATE,                     -- "08-02-1971"
    tax_filing_jointly    BOOLEAN DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- SALARY / TAX PAYMENT SETTINGS
-- ------------------------------------------------------------

CREATE TABLE employee_salary_settings (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    tax_calculation_method VARCHAR(50),             -- "N/A" / "Annualized" / etc.
    fixed_tax_rate        DECIMAL(5,2),             -- percentage, nullable
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- WORK ROLE HISTORY (tracks role changes over time)
-- ------------------------------------------------------------

CREATE TABLE work_role_history (
    id                SERIAL PRIMARY KEY,
    employee_id       INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id        INT REFERENCES companies(id),
    department_id     INT REFERENCES departments(id),
    designation_id    INT REFERENCES job_designations(id),
    is_current        BOOLEAN DEFAULT TRUE,
    effective_from    DATE NOT NULL,                -- "09-03-2026"
    effective_to      DATE,                         -- NULL = present
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- JOB LEVEL HISTORY
-- ------------------------------------------------------------

CREATE TABLE job_level_history (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    job_level_id    INT REFERENCES job_levels(id),
    is_current      BOOLEAN DEFAULT TRUE,
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- OFFICE LOCATION HISTORY
-- ------------------------------------------------------------

CREATE TABLE office_location_history (
    id                  SERIAL PRIMARY KEY,
    employee_id         INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    office_location_id  INT REFERENCES office_locations(id),
    is_current          BOOLEAN DEFAULT TRUE,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- MANAGER ASSIGNMENTS (supports multiple managers per employee)
-- ------------------------------------------------------------

CREATE TABLE manager_assignments (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    manager_id      INT REFERENCES employees(id),   -- NULL = "N/A"
    is_current      BOOLEAN DEFAULT FALSE,
    effective_from  DATE NOT NULL,                  -- "12-03-2026"
    effective_to    DATE,                           -- "09-03-2026 - 11-03-2026"
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- EMPLOYEE TYPE HISTORY
-- ------------------------------------------------------------

CREATE TABLE employee_type_history (
    id               SERIAL PRIMARY KEY,
    employee_id      INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_type    VARCHAR(50) NOT NULL,           -- "Direct Hire"
    work_assignment  VARCHAR(100),
    is_current       BOOLEAN DEFAULT TRUE,
    effective_from   DATE NOT NULL,
    effective_to     DATE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- COST CENTER
-- ------------------------------------------------------------

CREATE TABLE cost_centers (
    id            SERIAL PRIMARY KEY,
    company_id    INT REFERENCES companies(id),
    name          VARCHAR(100) NOT NULL
);

CREATE TABLE employee_cost_center (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    cost_center_id  INT REFERENCES cost_centers(id),
    is_current      BOOLEAN DEFAULT TRUE,
    effective_from  DATE,
    effective_to    DATE
);

-- ------------------------------------------------------------
-- APPRECIATIONS / BADGES
-- ------------------------------------------------------------

CREATE TABLE badges (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    icon_url    TEXT
);

CREATE TABLE employee_badges (
    id           SERIAL PRIMARY KEY,
    employee_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    badge_id     INT NOT NULL REFERENCES badges(id),
    awarded_at   TIMESTAMPTZ DEFAULT NOW(),
    awarded_by   INT REFERENCES employees(id)
);

-- ------------------------------------------------------------
-- APP MENU (drives the "All Apps" sidebar)
-- ------------------------------------------------------------

CREATE TABLE app_modules (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,    -- "Dashboard", "Task Box", "Profile" …
    icon_url    TEXT,
    route_path  VARCHAR(100),
    is_beta     BOOLEAN DEFAULT FALSE,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE role_app_permissions (
    id          SERIAL PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL,   -- "Admin", "Manager", "Employee"
    app_id      INT NOT NULL REFERENCES app_modules(id),
    can_view    BOOLEAN DEFAULT TRUE,
    can_edit    BOOLEAN DEFAULT FALSE
);