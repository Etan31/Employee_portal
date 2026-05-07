-- ============================================================
-- MY PREFERENCES MODULE — NEW TABLES ONLY
-- References existing: employees(id)
-- ============================================================


-- ------------------------------------------------------------
-- NOTIFICATION CATEGORIES
-- The left-side menu tabs seen across all screenshots:
-- HR Docs, Recognition, Attendance, Recruitment,
-- Task Delegation, Leave, Vibe, Offer Letter, Other
-- ------------------------------------------------------------
CREATE TABLE notification_categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,   -- "HR Docs", "Recognition", "Attendance"…
    sort_order INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT TRUE
);


-- ------------------------------------------------------------
-- NOTIFICATION EVENTS
-- Every distinct notification row visible in the UI.
-- Belongs to one category. Channels it supports are stored
-- as booleans so the UI knows which toggles to even render.
-- ------------------------------------------------------------
CREATE TABLE notification_events (
    id              SERIAL PRIMARY KEY,
    category_id     INT NOT NULL REFERENCES notification_categories(id),
    code            VARCHAR(150) NOT NULL UNIQUE,   -- stable machine key
    description     TEXT NOT NULL,                  -- human-readable label shown in UI

    -- Which channels are applicable for this event
    -- (some events have no Mobile or Bell column rendered)
    has_email       BOOLEAN DEFAULT TRUE,
    has_email_cc    BOOLEAN DEFAULT TRUE,
    has_mobile      BOOLEAN DEFAULT FALSE,
    has_bell        BOOLEAN DEFAULT FALSE,

    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- EMPLOYEE NOTIFICATION PREFERENCES
-- One row per employee per notification event.
-- Stores the on/off state of each applicable channel.
-- Many-to-Many: one employee has many event prefs,
--               one event has many employee prefs.
-- ------------------------------------------------------------
CREATE TABLE employee_notification_preferences (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    notification_event_id INT NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,

    -- The four toggle columns visible in the UI
    email_enabled         BOOLEAN DEFAULT TRUE,
    email_cc_enabled      BOOLEAN DEFAULT TRUE,
    mobile_enabled        BOOLEAN DEFAULT FALSE,
    bell_enabled          BOOLEAN DEFAULT FALSE,

    updated_at            TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (employee_id, notification_event_id)   -- one preference row per event per employee
);


-- ------------------------------------------------------------
-- EMPLOYEE DATE & TIME PREFERENCES
-- "DATE AND TIME" tab (second tab in My Preferences).
-- One-to-One with employees — each employee has exactly
-- one date/time settings record.
-- ------------------------------------------------------------
CREATE TABLE employee_datetime_preferences (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    timezone        VARCHAR(100),                   -- e.g. "Asia/Manila"
    date_format     VARCHAR(30),                    -- e.g. "DD-MM-YYYY"
    time_format     VARCHAR(10),                    -- e.g. "24hr" / "12hr"
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SEED: notification_categories
-- ============================================================
INSERT INTO notification_categories (name, sort_order) VALUES
    ('HR Docs',         1),
    ('Recognition',     2),
    ('Attendance',      3),
    ('Recruitment',     4),
    ('Task Delegation', 5),
    ('Leave',           6),
    ('Vibe',            7),
    ('Offer Letter',    8),
    ('Other',           9);


-- ============================================================
-- SEED: notification_events
-- All events visible across every screenshot + text provided.
-- code = stable snake_case key; category mapped by name above.
-- ============================================================

-- HR Docs
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT id, code, description, has_email, has_email_cc, has_mobile, has_bell
FROM notification_categories c
JOIN (VALUES
    ('HR Docs', 'hr_docs_ack_post_letter_request',
        'Acknowledgement email for employee post HR Letter request',
        TRUE, TRUE, FALSE, FALSE),
    ('HR Docs', 'hr_docs_nudge_approver_doc_generation',
        'Notification to Approver for Document Generation Request (Nudge)',
        TRUE, TRUE, TRUE, FALSE),
    ('HR Docs', 'hr_docs_doc_ack_task_due',
        'Notification to Employee when Document Acknowledgement task crosses due date',
        TRUE, TRUE, TRUE, FALSE),
    ('HR Docs', 'hr_docs_letter_generated_emailed',
        'Notification to employee when HR letter is generated and emailed',
        TRUE, TRUE, FALSE, FALSE),
    ('HR Docs', 'hr_docs_letter_pinned_profile',
        'Notification to employee when letter is pinned to his/her profile',
        TRUE, TRUE, FALSE, FALSE),
    ('HR Docs', 'hr_docs_policy_signoff_due',
        'Notification to Employee when Policy Sign-off task crosses due date',
        TRUE, TRUE, TRUE, FALSE),
    ('HR Docs', 'hr_docs_letter_gen_admin_submission',
        'Notification to Letter Generation Admins upon submission of letter request by employee',
        TRUE, TRUE, FALSE, FALSE),
    ('HR Docs', 'hr_docs_letter_approved',
        'Email when the requested letter is approved',
        TRUE, TRUE, TRUE, FALSE),
    ('HR Docs', 'hr_docs_letter_rejected',
        'Email when the requested letter is rejected',
        TRUE, TRUE, TRUE, FALSE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Recognition
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Recognition', 'recog_program_assigned',
        'Assignment of Recognition program to user',
        TRUE, TRUE, TRUE, TRUE),
    ('Recognition', 'recog_nominee_unshortlisted',
        'Notification to nominator upon un-shortlisting of nominee',
        TRUE, TRUE, FALSE, FALSE),
    ('Recognition', 'recog_team_member_added',
        'Notification to nominator upon addition of new team member(s) by nomination approver',
        TRUE, TRUE, FALSE, TRUE),
    ('Recognition', 'recog_team_member_removed',
        'Notification to nominator upon removal of team member(s) by nomination approver',
        TRUE, TRUE, FALSE, TRUE),
    ('Recognition', 'recog_team_member_added_removed',
        'Notification to nominator upon addition and removal of team member(s) by nomination approver',
        TRUE, TRUE, FALSE, TRUE),
    ('Recognition', 'recog_points_received',
        'Notification to user upon receipt of Recognition Points transferred by another user',
        TRUE, TRUE, FALSE, TRUE),
    ('Recognition', 'recog_program_closure',
        'Intimation of program closure to eligible recognizers',
        TRUE, TRUE, TRUE, TRUE),
    ('Recognition', 'recog_manual_nudge',
        'Manual nudge to all eligible recognizers to recognize under a program',
        TRUE, TRUE, TRUE, TRUE),
    ('Recognition', 'recog_panel_vote_request',
        'Notification to Panel Voting Member to vote on nomination',
        TRUE, TRUE, FALSE, FALSE),
    ('Recognition', 'recog_nudge_non_recognizers',
        'Nudge non-recognizers to recognize under assigned Recognition programs',
        TRUE, TRUE, TRUE, TRUE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Attendance
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Attendance', 'attendance_checkin_reminder',
        'Checkin Reminder notification to Employees',
        TRUE, TRUE, FALSE, FALSE),
    ('Attendance', 'attendance_absent_notification',
        'Send the "You are Absent" notification every time Employee doesn''t log attendance',
        TRUE, TRUE, FALSE, FALSE),
    ('Attendance', 'attendance_checkout_reminder',
        'Checkout Reminder notification to Employees',
        FALSE, FALSE, TRUE, FALSE),
    ('Attendance', 'attendance_request_approved',
        'Notification to requestor when approver approves the Attendance Request request',
        TRUE, TRUE, FALSE, FALSE),
    ('Attendance', 'attendance_new_shift_assigned',
        'Notification to Employee when new Shift is assigned',
        TRUE, TRUE, FALSE, FALSE),
    ('Attendance', 'attendance_request_submitted',
        'Notification to approvers when Employee submits the Attendance Request request',
        TRUE, TRUE, FALSE, FALSE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Recruitment
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Recruitment', 'recruit_pre_offer_completed',
        'Pre-Offer Completed mail', TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_requisition_auto_archival',
        'Notification to Initiator, Hiring Lead and Recruitment Admin(s) on requisition auto archival',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_requisition_archival',
        'Notification to Initiator and Recruitment Admin(s) on requisition archival',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_assessment_result_received',
        'Notification to evaluators when an assessment result is received',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_assessment_feedback_completed',
        'Notification to Evaluators when the assessment feedback is completed',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_assessment_scheduled',
        'Notification to Hiring Lead when an assessment is scheduled',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_hod_ijp_application',
        'Notification to HOD when any employee from the department applies for IJP',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_candidate_consent_decline',
        'Email to notify Candidate Consent Decline notification to Hiring Lead',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_review_request_task',
        'Notification to notify employees regarding review request task',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_modified_requisition_approved',
        'Notification to Recruitment Admin(s) and Hiring Lead(s) when a modified requisition has been approved / auto-approved',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_requisition_revoked',
        'Notification to Recruitment Admin(s) in case a Requisition is revoked / deleted by initiator',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_requisition_approved',
        'Notification to Hiring Lead(s) when a Requisition has been approved / auto-approved',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_pre_offer_submitted',
        'Notification to reviewers on submission of Pre-Offer by candidate',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_pre_offer_status_changed',
        'Notification to the recruiter when pre-offer status has been changed',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_pre_offer_bulk_triggered',
        'Notification to the recruiter on bulk triggering of pre-offer',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_ijp_invite',
        'Notification to Employee inviting application for IJP',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_internal_job_applied',
        'Notification to Hiring Lead when an employee applies for internal job',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_position_on_hold',
        'Notification to Hiring Manager when Position is put on-hold',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_candidate_copied_hiring_lead',
        'Copying Candidate Notification to Hiring Lead',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_referral_invite',
        'Notification to Employee for inviting Referral Applications',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_candidate_deleted',
        'Notification to Hiring Lead when candidate is deleted',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_ratings_updated',
        'Notification to Interviewer regarding updated ratings',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_candidate_moved_hiring_lead',
        'Moving Candidate Notification to Hiring Lead',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_interview_completed_lead_recruiter',
        'Interview Completion Notification to Hiring Lead & Recruiter',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_interview_completed_scheduling_group',
        'Interview Completion Notification to Scheduling Group',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_job_posting_end_reminder',
        'Reminder Notification for Job Posting End date',
        TRUE, TRUE, FALSE, FALSE),
    ('Recruitment', 'recruit_referral_candidate_added',
        'Notification to Hiring Lead & Recruiters when a candidate with Source as Referral is added to a job',
        TRUE, TRUE, FALSE, FALSE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Task Delegation
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Task Delegation', 'delegation_expired_or_revoked_delegate',
        'Notification to delegate after expiry or revoked of the delegation',
        TRUE, TRUE, TRUE, TRUE),
    ('Task Delegation', 'delegation_rule_created',
        'Notification to delegate when delegation rule is created',
        TRUE, TRUE, TRUE, TRUE),
    ('Task Delegation', 'delegation_expired_or_revoked_employee',
        'Notification to employee after expiry or revoked of the delegation',
        TRUE, TRUE, TRUE, TRUE),
    ('Task Delegation', 'delegation_task_delegated',
        'Notification to Employee when a task has been delegated',
        TRUE, TRUE, TRUE, FALSE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Leave
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Leave', 'leave_request_acknowledged',
        'Notification to Employee when Leave request is acknowledged',
        TRUE, TRUE, FALSE, FALSE),
    ('Leave', 'leave_flexible_holiday_response',
        'Notification to Employee when approver responds to Flexible Holiday date change request',
        TRUE, TRUE, FALSE, FALSE),
    ('Leave', 'leave_optional_holiday_response',
        'Notification to Employee when the Manager responds to an Optional Holiday request',
        TRUE, TRUE, FALSE, FALSE),
    ('Leave', 'leave_nudge_approver',
        'Notification to approver when the Employee click on nudge Leave request',
        TRUE, TRUE, FALSE, FALSE),
    ('Leave', 'leave_flexible_holiday_applied',
        'Notification to recipients when an Employee applies for Flexible Holiday date change',
        TRUE, TRUE, FALSE, FALSE),
    ('Leave', 'leave_applied',
        'Notification to recipients when an Employee applies for Leave',
        TRUE, TRUE, FALSE, FALSE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Vibe
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Vibe', 'vibe_group_invite',
        'Vibe Group membership invitation from Group admin to invitee',
        TRUE, TRUE, FALSE, FALSE),
    ('Vibe', 'vibe_new_notice',
        'Notification to Employees when a new notice is created in Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_comment_reply_on_commented',
        'Notification to Employees when someone comments/replies on content in which they have commented/replied',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_new_feed_content',
        'Notification to Employees when new content is created in the feed',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_new_group_content',
        'Notification to Employees when new content is created in a Vibe group',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_post_approved',
        'Notification to Employee on Post Approval',
        TRUE, TRUE, TRUE, TRUE),
    ('Vibe', 'vibe_post_rejected',
        'Notification to Employee on Post Rejection',
        TRUE, TRUE, TRUE, TRUE),
    ('Vibe', 'vibe_comment_on_my_content',
        'Notification to Employees when someone comments on their content in Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_comment_reply_on_tagged',
        'Notification to Employees when someone comments/replies on content in which they have been tagged',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_recognition',
        'Notification to employees when someone in their network receives a recognition',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_like_my_content',
        'Notification to Employees when someone likes their content on Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_like_tagged_content',
        'Notification to Employees when someone likes content in which they have been tagged',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_reply_to_my_comment',
        'Notification to Employees when someone replies to their comment in Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_reply_on_my_content',
        'Notification to Employees when someone replies on their content in Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_tagged_on_vibe',
        'Notification to Employees when they are tagged on Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_admin_new_feed_content',
        'Notification to Employees when new content is created by Vibe Admin in the feed',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_admin_tagged',
        'Notification to Employees when they are tagged on Vibe by admin',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_new_follower',
        'Notification to employee when they get followed on Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_birthday',
        'Notification to employees when someone in their network has a birthday',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_new_joinee',
        'Notification to employees when there is a new joinee in their network',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_work_anniversary',
        'Notification to employees when Work Anniversary in your network',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_group_membership_request',
        'Vibe Group membership request from user to Group admin',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_admin_creates_content',
        'Vibe admin creates content on Vibe feed',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_group_content_created',
        'Someone creates content on Vibe groups',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_mention_on_vibe',
        'Someone mentions me on Vibe',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_birthday_short',
        'Someone in my network has a birthday',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_anniversary_short',
        'Someone in my network has a work anniversary',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_newly_joined',
        'Someone in my network has newly joined',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_network_recognition_short',
        'Someone in my network receives a recognition',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_someone_likes_my_content',
        'Someone likes content created by me',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_someone_comments_my_content',
        'Someone comments on content created by me',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_reply_to_comment',
        'Someone replies to my comment',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_like_mentioned_content',
        'Someone likes content in which I am mentioned',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_comment_reply_mentioned',
        'Someone comments or replies on content in which I am mentioned',
        FALSE, FALSE, TRUE, TRUE),
    ('Vibe', 'vibe_comment_reply_commented',
        'Someone comments or replies on content on which I have commented or replied',
        FALSE, FALSE, TRUE, TRUE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;

-- Offer Letter
INSERT INTO notification_events (category_id, code, description, has_email, has_email_cc, has_mobile, has_bell)
SELECT c.id, v.code, v.description, v.has_email, v.has_email_cc, v.has_mobile, v.has_bell
FROM notification_categories c
JOIN (VALUES
    ('Offer Letter', 'offer_letter_expiry_reminder',
        'Offer Letter Expiry Reminder to Hiring Lead and Recruiters',
        TRUE, TRUE, FALSE, FALSE),
    ('Offer Letter', 'offer_letter_approval',
        'Offer Letter Approval Notification',
        TRUE, TRUE, FALSE, FALSE),
    ('Offer Letter', 'offer_proposal_approval',
        'Offer Proposal Approval Notification',
        TRUE, TRUE, FALSE, FALSE)
) AS v(cat_name, code, description, has_email, has_email_cc, has_mobile, has_bell)
ON c.name = v.cat_name;