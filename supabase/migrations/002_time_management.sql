-- ============================================================
-- TIME MANAGEMENT MODULE — NEW TABLES ONLY
-- References existing: employees(id)
-- ============================================================


-- ------------------------------------------------------------
-- SHIFTS
-- ------------------------------------------------------------
CREATE TABLE shifts (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,               -- "Morning Shift"
    start_time TIME NOT NULL,                       -- 08:00
    end_time   TIME NOT NULL,                       -- 17:00
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employee_shifts (
    id             SERIAL PRIMARY KEY,
    employee_id    INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id       INT NOT NULL REFERENCES shifts(id),
    is_current     BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_to   DATE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- ATTENDANCE RECORDS
-- One row per employee per working day
-- ------------------------------------------------------------
CREATE TABLE attendance_records (
    id                 SERIAL PRIMARY KEY,
    employee_id        INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date          DATE NOT NULL,
    clock_in           TIMESTAMPTZ,
    clock_out          TIMESTAMPTZ,
    work_duration_secs INT DEFAULT 0,               -- "Avg. Work Duration"
    late_by_secs       INT DEFAULT 0,               -- "Avg. Late By"
    overtime_secs      INT DEFAULT 0,               -- "Avg. Overtime"
    status             VARCHAR(30) NOT NULL
                       CHECK (status IN (
                           'Present', 'Absent',
                           'Weekly Off', 'Holiday', 'Leave'
                       )),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, work_date)
);


-- ------------------------------------------------------------
-- ATTENDANCE REGULARIZATION REQUESTS
-- "Regularize Your Attendance — absent for 5 days this month"
-- ------------------------------------------------------------
CREATE TABLE attendance_regularization_requests (
    id            SERIAL PRIMARY KEY,
    employee_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_id INT REFERENCES attendance_records(id),
    is_bulk       BOOLEAN DEFAULT FALSE,            -- TRUE = "Bulk Regularize"
    reason        TEXT,
    status        VARCHAR(20) DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by   INT REFERENCES employees(id),
    reviewed_at   TIMESTAMPTZ,
    submitted_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- LEAVE TYPES  ("Bereavement Leave", "Leave without Pay")
-- ------------------------------------------------------------
CREATE TABLE leave_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    is_paid         BOOLEAN DEFAULT TRUE,           -- FALSE = "Leave without Pay"
    default_balance INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- LEAVE REASONS  ("Select Leave Reason" dropdown)
-- ------------------------------------------------------------
CREATE TABLE leave_reasons (
    id    SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL UNIQUE
);


-- ------------------------------------------------------------
-- LEAVE BALANCES
-- "3 Bereavement Leave", "10 Leave without Pay"
-- ------------------------------------------------------------
CREATE TABLE leave_balances (
    id             SERIAL PRIMARY KEY,
    employee_id    INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id  INT NOT NULL REFERENCES leave_types(id),
    cycle_year     SMALLINT NOT NULL,               -- e.g. 2026
    total_days     INT NOT NULL DEFAULT 0,
    used_days      INT NOT NULL DEFAULT 0,
    available_days INT GENERATED ALWAYS AS
                   (total_days - used_days) STORED, -- "Available Balance: 10"
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, leave_type_id, cycle_year)
);


-- ------------------------------------------------------------
-- LEAVE REQUESTS  (full form: type, from/to, reason, message)
-- ------------------------------------------------------------
CREATE TABLE leave_requests (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   INT NOT NULL REFERENCES leave_types(id),
    leave_reason_id INT REFERENCES leave_reasons(id),
    date_from       DATE NOT NULL,
    date_to         DATE NOT NULL,
    message         TEXT,
    status          VARCHAR(20) DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    reviewed_by     INT REFERENCES employees(id),
    reviewed_at     TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- LEAVE REQUEST ATTACHMENTS  (Max: 3 files per request)
-- ------------------------------------------------------------
CREATE TABLE leave_request_attachments (
    id               SERIAL PRIMARY KEY,
    leave_request_id INT NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    file_url         TEXT NOT NULL,
    file_name        VARCHAR(255),
    file_size_bytes  INT,
    mime_type        VARCHAR(100),
    uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- LEAVE REQUEST RECIPIENTS
-- "Recipients: Marly Paraiso" + "+ Additional Recipients"
-- ------------------------------------------------------------
CREATE TABLE leave_request_recipients (
    id               SERIAL PRIMARY KEY,
    leave_request_id INT NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    recipient_id     INT NOT NULL REFERENCES employees(id),
    is_primary       BOOLEAN DEFAULT FALSE,         -- TRUE = auto-assigned manager
    added_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- HOLIDAYS  ("Upcoming Time Off" side panel)
-- "01 May - Labor Day", "12 Jun - Independence Day" …
-- Not employee-specific — company-wide calendar
-- ------------------------------------------------------------
CREATE TABLE holidays (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL UNIQUE,
    holiday_type VARCHAR(30) DEFAULT 'Holiday'
                 CHECK (holiday_type IN (
                     'Holiday', 'National Holiday', 'Special Non-Working'
                 )),
    description  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- TEAM ABSENCE SUMMARY  ("Who's out in the Team")
-- ------------------------------------------------------------
CREATE TABLE team_absence_summaries (
    id          SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    week_start  DATE NOT NULL,                      -- "25-04-2026"
    week_end    DATE NOT NULL,                      -- "29-04-2026"
    message     TEXT,                               -- "Team at its strongest!"
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, week_start, week_end)
);


-- ------------------------------------------------------------
-- ALTER employees — add current shift reference
-- ------------------------------------------------------------
ALTER TABLE employees
    ADD COLUMN current_shift_id INT REFERENCES shifts(id) ON DELETE SET NULL;