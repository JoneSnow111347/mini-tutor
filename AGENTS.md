# AGENTS.md

## Project Overview

This is a tutoring marketplace mini-program project for Wuhan.

The platform connects:

1. Parents/students
2. Teachers

---

# Product Philosophy

This project is MVP-first.

Do NOT build a large platform all at once.

Focus on:

* simple
* usable
* stable
* real-world workflow
* maintainable architecture

Avoid unnecessary enterprise complexity and excessive abstraction.

---

# Core Features

Required features:

* login
* role selection
* teacher onboarding
* identity verification
* demand publishing
* teacher profile
* demand browsing
* apply/contact
* admin review

---

# Architecture Rules

This project must maintain ONE unified authentication and onboarding system.

Avoid duplicate systems.

Do NOT create:

* duplicate login flows
* duplicate register flows
* duplicate teacher dashboards
* duplicate session management systems
* duplicate identity verification systems
* duplicate role state systems

---

# Source of Truth Rules

The backend database is the single source of truth for:

* user role
* authentication state
* verification state

Frontend code must NEVER:

* hardcode role='teacher'
* overwrite user roles locally
* assume default roles
* infer roles from UI routes

The only trusted role source:

* backend users.role field

---

# Session / Storage Rules

This project must maintain ONE unified session storage schema.

Use ONLY:

wx.setStorageSync('userInfo', {
id,
role,
token,
nickname
})

Do NOT:

* store flat role keys
* store separate token keys
* store duplicate session fields
* create parallel Vue/native session systems

Do NOT use:

* wx.setStorageSync('role')
* wx.setStorageSync('token')
* duplicated storage schemas

Frontend session source of truth:

* userInfo object in storage

Before modifying auth/session logic:

1. trace current storage usage
2. verify storage key consistency
3. verify session restore logic
4. verify role source of truth

---

# Teacher Authentication Rules

Teacher authentication and onboarding must use the native mini-program flow only.

Official teacher flow:

login/login.js
→ register/register.js
→ teacher-profile/edit-teacher.js
→ identity verification
→ admin review

Vue teacher auth pages are deprecated.

Do NOT recreate:

* Vue teacher login
* Vue teacher register
* Vue teacher verification flow

---

# Vue Usage Rules

Vue pages may be used for:

* parent-side pages
* presentation pages
* lightweight dashboards
* non-auth UI

Vue pages must NOT:

* implement authentication logic
* implement registration logic
* implement identity verification submission
* create separate session systems
* create separate role systems

---

# Route / Navigation Rules

Before modifying routes:

1. check app.json
2. check pages.json
3. identify active user flow
4. verify navigation targets
5. verify role compatibility

Do NOT create hidden or parallel navigation flows.

---

# Coding Rules

* keep it simple
* minimal runnable code
* avoid overengineering
* reuse existing APIs
* avoid unnecessary abstractions
* explain before large changes

Prefer:

* focused modifications
* incremental refactors
* maintainable structure
* backward compatibility

---

# Optional Skill Usage Rules

UI enhancement skills may be used selectively for dedicated UI redesign tasks.

frontend-design may be useful for:

* visual hierarchy refinement
* spacing improvements
* product-level UI polish
* reducing AI-generated appearance

ui-ux-pro-max may be useful for:

* onboarding UX
* interaction feedback
* CTA hierarchy
* form usability

Do NOT globally apply UI enhancement skills.

Avoid overdesigned interfaces.
Prefer realistic and restrained product aesthetics.

---

# UI Rules

UI goals:

* professional
* fresh
* lively
* modern
* interactive
* clean
* realistic
* mobile-first
* real product feel
* no AI-generated appearance

Requirements:

* strong visual hierarchy
* smooth spacing rhythm
* layered cards
* soft shadows
* balanced color palette
* tactile interaction
* modern Chinese mobile app aesthetics

Avoid:

* generic AI-style layouts
* excessive gradients
* over-decoration
* cluttered spacing
* random visual effects

---

# Debugging Rules

When debugging:

1. trace the complete data flow
2. inspect API requests/responses
3. inspect backend write path
4. inspect database state
5. inspect admin query conditions
6. identify root cause before editing

Do NOT patch symptoms only.

---

# Refactor Rules

Before large refactors:

1. analyze first
2. propose migration strategy
3. identify affected routes/pages
4. preserve backward compatibility
5. avoid hidden architecture changes

Large refactors must be staged incrementally.
