# Database Design

## Scope

This document defines the MVP database design for the tutoring marketplace.
It is designed for a Node.js + MySQL backend and only covers the core tables needed now:

- `user`
- `teacher_profile`
- `demand`
- `apply`

No SQL migration files are included in this stage.

## Design Notes

- Use `BIGINT UNSIGNED` for primary keys to keep backend code simple and scalable.
- Use `DATETIME` for timestamps: `created_at`, `updated_at`.
- Use `TINYINT(1)` for boolean-like fields in MySQL.
- Use `ENUM` only where the values are small and stable in the MVP.
- The table name `user` is allowed for this project, but in MySQL queries it is safer to wrap it as `` `user` ``.
- Keep status fields simple so the API layer can evolve without frequent schema changes.

## Table: `user`

### Purpose

Store login identity and basic account information for both parents/students and teachers.

### Fields

| Field | Type | Required | Simple explanation |
| --- | --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | Yes | Primary key. |
| `phone` | `VARCHAR(20)` | Yes | Main login account, suitable for China mobile numbers. |
| `password_hash` | `VARCHAR(255)` | No | Password hash if phone/password login is used. Can be null for code-based login. |
| `role` | `ENUM('parent','teacher','both')` | Yes | User role selected after login. `both` supports users who publish demands and also teach. |
| `nickname` | `VARCHAR(50)` | No | Display name for quick identification. |
| `avatar_url` | `VARCHAR(255)` | No | User avatar image URL. |
| `status` | `ENUM('active','disabled')` | Yes | Whether the account can be used. |
| `last_login_at` | `DATETIME` | No | Last successful login time. |
| `created_at` | `DATETIME` | Yes | Record creation time. |
| `updated_at` | `DATETIME` | Yes | Record update time. |

### Notes

- `phone` should be unique.
- One `user` can be either a parent/student account or a teacher account.
- Teacher-specific information should not be stored here; keep that in `teacher_profile`.

## Table: `teacher_profile`

### Purpose

Store teacher profile details used for browsing, matching, and contact decisions.

### Fields

| Field | Type | Required | Simple explanation |
| --- | --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | Yes | Primary key. |
| `user_id` | `BIGINT UNSIGNED` | Yes | Links to the teacher's `user` account. |
| `real_name` | `VARCHAR(50)` | Yes | Teacher's real name. |
| `gender` | `ENUM('male','female','other')` | No | Basic profile info for display/filtering. |
| `school` | `VARCHAR(100)` | No | Current or graduated school. |
| `major` | `VARCHAR(100)` | No | Teacher's major or main study direction. |
| `education_level` | `VARCHAR(50)` | No | Education summary such as bachelor or master. |
| `experience_years` | `INT` | No | Approximate tutoring or teaching years. |
| `teaching_subjects` | `VARCHAR(255)` | Yes | Subjects the teacher can teach, stored simply as text in MVP. |
| `teaching_grades` | `VARCHAR(100)` | No | Grade range such as primary, middle school, high school. |
| `teaching_area` | `VARCHAR(100)` | No | Area in Wuhan where the teacher can teach. |
| `available_time` | `VARCHAR(255)` | No | Simple text for available schedule in MVP. |
| `intro` | `TEXT` | No | Self introduction and teaching highlights. |
| `hourly_rate_min` | `DECIMAL(10,2)` | No | Expected minimum hourly price. |
| `hourly_rate_max` | `DECIMAL(10,2)` | No | Expected maximum hourly price. |
| `verification_status` | `ENUM('pending','approved','rejected')` | Yes | Teacher verification review result. |
| `verification_note` | `VARCHAR(255)` | No | Review note for rejection or internal follow-up. |
| `is_public` | `TINYINT(1)` | Yes | Whether the profile is visible in the list page. |
| `created_at` | `DATETIME` | Yes | Record creation time. |
| `updated_at` | `DATETIME` | Yes | Record update time. |

### Notes

- `user_id` should be unique so one teacher account has one profile.
- `user_id` should reference `user.id`.
- `teaching_subjects` is text for MVP simplicity. It can be normalized later if filtering becomes complex.
- `available_time` is also kept as plain text for MVP simplicity.
- `hourly_rate_min` and `hourly_rate_max` should be validated in application code so min is not greater than max.

## Table: `demand`

### Purpose

Store tutoring requests published by parents/students.

### Fields

| Field | Type | Required | Simple explanation |
| --- | --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | Yes | Primary key. |
| `user_id` | `BIGINT UNSIGNED` | Yes | Publisher of the tutoring demand. |
| `title` | `VARCHAR(100)` | Yes | Short title for list pages. |
| `subject` | `VARCHAR(50)` | Yes | Main tutoring subject. |
| `grade_level` | `VARCHAR(50)` | Yes | Student grade or school stage. |
| `target` | `VARCHAR(255)` | No | Main improvement target such as exam prep or homework support. |
| `area` | `VARCHAR(100)` | Yes | Teaching area in Wuhan. |
| `address_detail` | `VARCHAR(255)` | No | More detailed address for contact stage. |
| `budget_min` | `DECIMAL(10,2)` | No | Minimum expected tutoring fee. |
| `budget_max` | `DECIMAL(10,2)` | No | Maximum expected tutoring fee. |
| `class_mode` | `ENUM('offline','online','both')` | Yes | Whether the demand is offline, online, or flexible. |
| `description` | `TEXT` | Yes | Main demand description and requirements. |
| `contact_name` | `VARCHAR(50)` | Yes | Contact person name. |
| `contact_phone` | `VARCHAR(20)` | Yes | Contact phone number. |
| `status` | `ENUM('open','closed')` | Yes | Whether teachers can still apply. |
| `created_at` | `DATETIME` | Yes | Record creation time. |
| `updated_at` | `DATETIME` | Yes | Record update time. |

### Notes

- `user_id` should reference `user.id`.
- In MVP, `contact_phone` is stored directly to keep the flow simple.
- `contact_name` and `contact_phone` should not be exposed in public list APIs by default.
- If privacy rules become stricter later, contact fields can move behind an authorization layer or separate table.

## Table: `apply`

### Purpose

Store teacher applications or contact attempts for a specific tutoring demand.

### Fields

| Field | Type | Required | Simple explanation |
| --- | --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | Yes | Primary key. |
| `demand_id` | `BIGINT UNSIGNED` | Yes | The demand being applied to. |
| `teacher_user_id` | `BIGINT UNSIGNED` | Yes | The teacher account making the application. |
| `message` | `VARCHAR(500)` | No | Short introduction or application note. |
| `status` | `ENUM('pending','accepted','rejected','cancelled')` | Yes | Current state of the application. |
| `review_note` | `VARCHAR(255)` | No | Short note from the demand owner when reviewing the application. |
| `contact_shared_at` | `DATETIME` | No | Time when contact details were actually shared. |
| `created_at` | `DATETIME` | Yes | Record creation time. |
| `updated_at` | `DATETIME` | Yes | Record update time. |

### Notes

- `demand_id` should reference `demand.id`.
- `teacher_user_id` should reference `user.id`.
- Add a unique constraint on (`demand_id`, `teacher_user_id`) so the same teacher does not apply repeatedly to the same demand.
- This table is enough for MVP contact/apply flow without adding a full chat system.

## Relationship Summary

- One `user` can have zero or one `teacher_profile`.
- One parent/student `user` can publish many `demand` records.
- One `demand` can receive many `apply` records.
- One teacher `user` can submit many `apply` records.

## Recommended Indexes

For MVP performance, these indexes are enough:

- `user`: unique index on `phone`
- `teacher_profile`: unique index on `user_id`
- `teacher_profile`: index on `is_public`
- `demand`: index on `user_id`
- `demand`: index on `status`
- `demand`: index on (`subject`, `grade_level`, `area`)
- `apply`: unique index on (`demand_id`, `teacher_user_id`)
- `apply`: index on `teacher_user_id`
- `apply`: index on `status`

## Practical Backend Mapping

Suggested API ownership for the current server modules:

- `user` module: login, role selection, account status
- `teacher` module: teacher profile create/update/detail/list
- `demand` module: publish, edit, close, list, detail
- `apply` module: apply to demand, list applications, accept/reject

This keeps the schema aligned with the current MVP backend structure and avoids overengineering.
