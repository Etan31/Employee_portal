-- ============================================================
-- DATE & TIME PREFERENCES — LOOKUP TABLES + ALTER
-- The employee_datetime_preferences table already exists.
-- We now normalize its 3 free-text columns into proper FKs.
-- ============================================================


-- ------------------------------------------------------------
-- DATE FORMAT OPTIONS
-- Exact values from the dropdown (Image 2):
--   01-09-2023  |  09-01-2023  |  Sep-01-2023
--   2023-09-01  |  2023-Sep-01 |  01/09/2023
-- ------------------------------------------------------------
CREATE TABLE date_format_options (
    id          SERIAL PRIMARY KEY,
    format_code VARCHAR(20)  NOT NULL UNIQUE,   -- stored value e.g. "DD-MM-YYYY"
    example     VARCHAR(30)  NOT NULL,           -- displayed in dropdown e.g. "01-09-2023"
    sort_order  INT DEFAULT 0
);

INSERT INTO date_format_options (format_code, example, sort_order) VALUES
    ('DD-MM-YYYY',  '01-09-2023',  1),
    ('MM-DD-YYYY',  '09-01-2023',  2),
    ('MMM-DD-YYYY', 'Sep-01-2023', 3),
    ('YYYY-MM-DD',  '2023-09-01',  4),
    ('YYYY-MMM-DD', '2023-Sep-01', 5),
    ('DD/MM/YYYY',  '01/09/2023',  6);


-- ------------------------------------------------------------
-- TIME FORMAT OPTIONS
-- Exact values from the dropdown (Image 3):
--   24-hour – 18:45:00
--   12-hour – 6:45:00 PM
-- ------------------------------------------------------------
CREATE TABLE time_format_options (
    id          SERIAL PRIMARY KEY,
    format_code VARCHAR(10)  NOT NULL UNIQUE,   -- "24h" / "12h"
    label       VARCHAR(30)  NOT NULL,           -- "24-hour - 18:45:00"
    sort_order  INT DEFAULT 0
);

INSERT INTO time_format_options (format_code, label, sort_order) VALUES
    ('24h', '24-hour - 18:45:00',  1),
    ('12h', '12-hour - 6:45:00 PM', 2);


-- ------------------------------------------------------------
-- TIMEZONE OPTIONS
-- Values visible in dropdown (Image 4) — extensible list.
-- utc_offset stored as signed SMALLINT minutes for easy math.
-- ------------------------------------------------------------
CREATE TABLE timezone_options (
    id          SERIAL PRIMARY KEY,
    tz_code     VARCHAR(100) NOT NULL UNIQUE,    -- IANA key e.g. "Asia/Manila"
    label       TEXT         NOT NULL,           -- full display label in dropdown
    utc_offset  SMALLINT     NOT NULL,           -- offset in minutes e.g. +480 for UTC+8
    sort_order  INT DEFAULT 0
);

INSERT INTO timezone_options (tz_code, label, utc_offset, sort_order) VALUES
    ('Asia/Manila',      '(UTC+08:00) Asia/Manila Singapore Standard Time',      480,  1),
    ('Asia/Singapore',   '(UTC+08:00) Asia/Singapore Singapore Standard Time',   480,  2),
    ('Africa/Harare',    '(UTC+02:00) Harare, Pretoria',                         120,  3),
    ('Asia/Colombo',     '(UTC+05:30) Sri Jayawardenepura',                      330,  4),
    ('Asia/Taipei',      '(UTC+08:00) Taipei',                                   480,  5);


-- ------------------------------------------------------------
-- ALTER employee_datetime_preferences
-- Replace the 3 free-text columns added previously with
-- proper FK columns pointing to the new lookup tables.
-- Run DROP COLUMN first only if the old columns exist.
-- ------------------------------------------------------------

-- Remove old free-text columns
ALTER TABLE employee_datetime_preferences
    DROP COLUMN IF EXISTS date_format,
    DROP COLUMN IF EXISTS time_format,
    DROP COLUMN IF EXISTS timezone;

-- Add normalized FK columns
ALTER TABLE employee_datetime_preferences
    ADD COLUMN date_format_id  INT REFERENCES date_format_options(id) ON DELETE SET NULL,
    ADD COLUMN time_format_id  INT REFERENCES time_format_options(id) ON DELETE SET NULL,
    ADD COLUMN timezone_id     INT REFERENCES timezone_options(id)    ON DELETE SET NULL;