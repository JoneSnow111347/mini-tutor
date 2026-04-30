# Front-End Development Document — Tutor Miniapp

> Platform: WeChat MiniProgram / UniApp  
> Backend base URL: `http://localhost:3000/api`  
> All responses follow the unified envelope: `{ success: boolean, data: any, message?: string }`  
> Document date: 2026-04-20

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Data Structures](#2-data-structures)
3. [API Interface Reference](#3-api-interface-reference)
4. [Page Specifications](#4-page-specifications)
   - 4.1 [Home — Role Selection](#41-home--role-selection)
   - 4.2 [Parent Register](#42-parent-register)
   - 4.3 [Parent Login](#43-parent-login)
   - 4.4 [Publish Demand](#44-publish-demand)
   - 4.5 [View Applications](#45-view-applications)
   - 4.6 [Accept / Reject Application](#46-accept--reject-application)
   - 4.7 [Teacher Register](#47-teacher-register)
   - 4.8 [Teacher Login](#48-teacher-login)
   - 4.9 [Teacher Profile](#49-teacher-profile)
   - 4.10 [Browse Demands](#410-browse-demands)
   - 4.11 [Apply to Demand](#411-apply-to-demand)
5. [State Management](#5-state-management)
6. [Development Notes](#6-development-notes)
7. [Business Flow Diagram](#7-business-flow-diagram)

---

## 1. Project Overview

A Wuhan-local, low-friction tutoring matchmaking miniapp. There are two user roles:

| Role | Typical Action |
|------|---------------|
| `parent` | Publish tutoring demands, review teacher applications, accept or reject |
| `teacher` | Complete a teacher profile, browse open demands, apply to relevant ones |
| `both` | User who acts as both a parent and a teacher |

The app is **session-based**: after login the user's `id` and `role` are persisted in global state and used for all subsequent requests. There is no JWT in the current MVP; the frontend must store `userId` locally.

---

## 2. Data Structures

These structures mirror the database schema exactly. Fields marked **Required** must be present in every POST request.

### 2.1 User

```ts
interface User {
  id: number;                          // BIGINT, auto-incremented
  phone: string;                       // VARCHAR(20), unique
  role: 'parent' | 'teacher' | 'both'; // ENUM, required at registration
  nickname: string | null;             // VARCHAR(64)
  avatar_url: string | null;           // VARCHAR(512)
  status: 'active' | 'inactive';      // ENUM, default 'active'
  createdAt: string;                   // ISO 8601 timestamp
  updatedAt: string;
}
```

### 2.2 Teacher

```ts
interface Teacher {
  id: number;
  user_id: number;                     // FK → users.id
  real_name: string;                   // VARCHAR(64), required
  teaching_subjects: string;           // VARCHAR(256), required — free text, e.g. "数学,物理"
  verification_status: 'pending' | 'verified' | 'rejected'; // default 'pending'
  is_public: boolean;                  // default true
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 Demand

```ts
interface Demand {
  id: number;
  user_id: number | null;              // FK → users.id, optional at creation
  title: string;                       // VARCHAR(128), required
  subject: string;                     // VARCHAR(64), required
  grade_level: string;                 // VARCHAR(64), required, e.g. "初中二年级"
  area: string;                        // VARCHAR(128), required, e.g. "武汉市洪山区"
  class_mode: string;                  // VARCHAR(64), required, e.g. "线下" | "线上" | "均可"
  description: string;                 // TEXT, required
  contact_name: string;                // VARCHAR(64), required
  contact_phone: string;               // VARCHAR(20), required
  status: 'open' | 'closed';          // default 'open'
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 Apply

```ts
interface Apply {
  id: number;
  demand_id: number;                   // FK → demands.id, required
  teacher_user_id: number;             // FK → users.id, required
  message: string | null;             // TEXT, optional application note
  status: 'pending' | 'accepted' | 'rejected'; // default 'pending'
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. API Interface Reference

> All request bodies use `Content-Type: application/json`.  
> GET requests carry parameters in the URL query string — never in the body.  
> A successful response always has `success: true`. A failed response has `success: false` plus a `message` string and optionally an `errors` array listing missing fields.

### 3.1 User Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| U1 | `POST` | `/api/users` | Register a new user |
| U2 | `POST` | `/api/users/login` | Login by phone |
| U3 | `GET` | `/api/users/:id` | Get user by ID |
| U4 | `PUT` | `/api/users/:id` | Update user profile |

#### U1 — Register User

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | Yes | 11-digit mobile number |
| `role` | string | Yes | `'parent'` \| `'teacher'` \| `'both'` |
| `nickname` | string | No | Display name |
| `avatar_url` | string | No | Avatar image URL |

**Response (201)**

```json
{
  "success": true,
  "message": "User created",
  "data": {
    "id": 1,
    "phone": "13800138000",
    "role": "parent",
    "nickname": null,
    "avatar_url": null,
    "status": "active",
    "createdAt": "2026-04-20T08:00:00.000Z",
    "updatedAt": "2026-04-20T08:00:00.000Z"
  }
}
```

**Error cases**

| HTTP | Condition |
|------|-----------|
| 400 | Missing `phone` or `role` |
| 400 | `role` not in allowed values |
| 409 | Phone number already registered |

---

#### U2 — Login

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `phone` | string | Yes |

**Response (200)**

```json
{
  "success": true,
  "data": { /* User object */ }
}
```

**Error cases**

| HTTP | Condition |
|------|-----------|
| 400 | Missing `phone` |
| 404 | Phone not registered |

---

#### U3 — Get User by ID

**URL param**: `id` (integer)  
**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": { /* User object */ }
}
```

---

#### U4 — Update User

**URL param**: `id`

**Request body** (send only fields to update)

| Field | Type | Notes |
|-------|------|-------|
| `phone` | string | Must remain unique |
| `role` | string | `'parent'` \| `'teacher'` \| `'both'` |
| `nickname` | string | |
| `avatar_url` | string | |
| `status` | string | `'active'` \| `'inactive'` |

**Response (200)**

```json
{
  "success": true,
  "message": "User updated",
  "data": { /* Updated User object */ }
}
```

---

### 3.2 Teacher Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| T1 | `POST` | `/api/teachers` | Create teacher profile |
| T2 | `GET` | `/api/teachers` | List all public teacher profiles |
| T3 | `GET` | `/api/teachers/:id` | Get teacher profile by ID |
| T4 | `PUT` | `/api/teachers/:id` | Update teacher profile |

#### T1 — Create Teacher Profile

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | number | Yes | Logged-in user's ID |
| `real_name` | string | Yes | Legal name |
| `teaching_subjects` | string | Yes | Comma-separated subjects, e.g. `"数学,物理"` |
| `verification_status` | string | No | Default `'pending'` |
| `is_public` | boolean | No | Default `true` |

**Response (201)**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "user_id": 1,
    "real_name": "张伟",
    "teaching_subjects": "数学,物理",
    "verification_status": "pending",
    "is_public": true,
    "createdAt": "2026-04-20T08:00:00.000Z",
    "updatedAt": "2026-04-20T08:00:00.000Z"
  }
}
```

---

#### T2 — List Teachers

**No request body.** Returns all teacher records.

**Response (200)**

```json
{
  "success": true,
  "data": [ /* Array of Teacher objects */ ]
}
```

---

#### T3 — Get Teacher by ID

**URL param**: `id`  
**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": { /* Teacher object */ }
}
```

---

#### T4 — Update Teacher Profile

**URL param**: `id` (teacher record ID, not user ID)

**Request body** (send only fields to update)

| Field | Type |
|-------|------|
| `real_name` | string |
| `teaching_subjects` | string |
| `verification_status` | string |
| `is_public` | boolean |

**Response (200)**

```json
{
  "success": true,
  "data": { /* Updated Teacher object */ }
}
```

---

### 3.3 Demand Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| D1 | `POST` | `/api/demands` | Publish a new demand |
| D2 | `GET` | `/api/demands` | List all open demands |
| D3 | `GET` | `/api/demands/:id` | Get demand detail |
| D4 | `PUT` | `/api/demands/:id` | Update demand (including closing it) |

#### D1 — Publish Demand

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | Yes | Short title for list display |
| `subject` | string | Yes | e.g. `"数学"` |
| `grade_level` | string | Yes | e.g. `"初中二年级"` |
| `area` | string | Yes | e.g. `"武汉市洪山区"` |
| `class_mode` | string | Yes | e.g. `"线下"` / `"线上"` / `"均可"` |
| `description` | string | Yes | Detailed requirement description |
| `contact_name` | string | Yes | Contact person |
| `contact_phone` | string | Yes | Contact phone |
| `user_id` | number | No | Logged-in parent's user ID |

**Response (201)**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "user_id": 2,
    "title": "初二数学辅导",
    "subject": "数学",
    "grade_level": "初中二年级",
    "area": "武汉市洪山区",
    "class_mode": "线下",
    "description": "希望周末上午...",
    "contact_name": "李妈妈",
    "contact_phone": "13900139000",
    "status": "open",
    "createdAt": "2026-04-20T09:00:00.000Z",
    "updatedAt": "2026-04-20T09:00:00.000Z"
  }
}
```

---

#### D2 — List Demands

**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": [ /* Array of Demand objects */ ]
}
```

---

#### D3 — Get Demand Detail

**URL param**: `id`  
**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": { /* Demand object */ }
}
```

---

#### D4 — Update Demand

**URL param**: `id`

**Request body** (send only fields to update)

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | |
| `subject` | string | |
| `grade_level` | string | |
| `area` | string | |
| `class_mode` | string | |
| `description` | string | |
| `contact_name` | string | |
| `contact_phone` | string | |
| `status` | string | `'open'` \| `'closed'` — use to close a demand |

**Response (200)**

```json
{
  "success": true,
  "data": { /* Updated Demand object */ }
}
```

---

### 3.4 Apply Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| A1 | `POST` | `/api/applies` | Teacher submits an application |
| A2 | `GET` | `/api/applies?demand_id=X` | List applications for a demand (parent view) |
| A3 | `GET` | `/api/applies?teacher_user_id=X` | List applications by a teacher |
| A4 | `GET` | `/api/applies/:id` | Get single application detail |
| A5 | `PUT` | `/api/applies/:id` | Accept or reject an application |

#### A1 — Submit Application

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `demand_id` | number | Yes | Target demand ID |
| `teacher_user_id` | number | Yes | Logged-in teacher's user ID |
| `message` | string | No | Brief self-introduction or pitch |

**Response (201)**

```json
{
  "success": true,
  "message": "Application submitted",
  "data": {
    "id": 10,
    "demand_id": 5,
    "teacher_user_id": 1,
    "message": "您好，我是武汉大学数学系...",
    "status": "pending",
    "createdAt": "2026-04-20T10:00:00.000Z",
    "updatedAt": "2026-04-20T10:00:00.000Z"
  }
}
```

**Error cases**

| HTTP | Condition |
|------|-----------|
| 400 | Missing `demand_id` or `teacher_user_id` |
| 409 | Same teacher already applied to this demand |

---

#### A2 — List Applications for a Demand (Parent)

**Query string**: `?demand_id=5`  
**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": [ /* Array of Apply objects where demand_id = 5 */ ]
}
```

---

#### A3 — List My Applications (Teacher)

**Query string**: `?teacher_user_id=1`  
**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": [ /* Array of Apply objects where teacher_user_id = 1 */ ]
}
```

---

#### A4 — Get Application Detail

**URL param**: `id`  
**No request body.**

**Response (200)**

```json
{
  "success": true,
  "data": { /* Apply object */ }
}
```

---

#### A5 — Accept or Reject Application

**URL param**: `id`

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | string | Yes | `'accepted'` \| `'rejected'` |

**Response (200)**

```json
{
  "success": true,
  "message": "Application status updated",
  "data": { /* Updated Apply object */ }
}
```

**Error cases**

| HTTP | Condition |
|------|-----------|
| 400 | `status` missing or invalid value |
| 404 | Application not found |

---

## 4. Page Specifications

### 4.1 Home — Role Selection

**Route**: `/pages/index/index`

**Function**  
Entry page. Checks if a `userId` is cached in storage. If yes, redirects to the appropriate role dashboard. If no, shows two buttons: **家长/学生入口** and **老师入口**.

**API calls**: None (reads local storage only)

**UI elements**
- App logo and tagline
- Button: 我是家长/学生 → navigates to `/pages/auth/parent-login`
- Button: 我是老师 → navigates to `/pages/auth/teacher-login`

**Logic**
```
onLoad:
  userId = storage.get('userId')
  role   = storage.get('role')
  if userId:
    if role === 'teacher' → redirectTo teacher-home
    else                  → redirectTo parent-home
```

---

### 4.2 Parent Register

**Route**: `/pages/auth/parent-register`

**Function**  
Allows a new parent/student user to create an account. On success, saves `userId` and `role` to storage and navigates to the parent home.

**API used**: [U1 — POST /api/users](#u1--register-user)

**Form fields**

| Field | Input type | Validation |
|-------|-----------|------------|
| 手机号 `phone` | tel | 11 digits, required |
| 昵称 `nickname` | text | optional |

`role` is hardcoded as `'parent'` in the request body.

**Request example**
```json
{
  "phone": "13800138000",
  "role": "parent",
  "nickname": "李妈妈"
}
```

**Success flow**  
Store `userId = data.id`, `role = data.role` → `redirectTo /pages/parent/home`

**Error handling**
- 409 Conflict → show "该手机号已注册，请直接登录"
- 400 Missing fields → highlight empty inputs

---

### 4.3 Parent Login

**Route**: `/pages/auth/parent-login`

**Function**  
Existing parent logs in with phone number. On success, stores session and redirects to parent home.

**API used**: [U2 — POST /api/users/login](#u2--login)

**Form fields**

| Field | Input type | Validation |
|-------|-----------|------------|
| 手机号 `phone` | tel | 11 digits, required |

**Request example**
```json
{ "phone": "13800138000" }
```

**Success flow**  
Store `userId = data.id`, `role = data.role` → `redirectTo /pages/parent/home`

**Error handling**
- 404 → show "手机号未注册，请先注册"
- Link to parent register page

---

### 4.4 Publish Demand

**Route**: `/pages/parent/publish-demand`

**Function**  
Parent fills in a tutoring demand form. On submit the demand is created via API and the parent is redirected to their demand list.

**API used**: [D1 — POST /api/demands](#d1--publish-demand)

**Form fields**

| Field | Label | Input type | Required |
|-------|-------|-----------|----------|
| `title` | 需求标题 | text | Yes |
| `subject` | 科目 | picker / text | Yes |
| `grade_level` | 年级 | picker / text | Yes |
| `area` | 上课地区 | text | Yes |
| `class_mode` | 上课方式 | radio: 线下 / 线上 / 均可 | Yes |
| `description` | 详细说明 | textarea | Yes |
| `contact_name` | 联系人 | text | Yes |
| `contact_phone` | 联系电话 | tel | Yes |

`user_id` is injected from global state (`app.globalData.userId`) before sending.

**Request example**
```json
{
  "user_id": 2,
  "title": "初二数学辅导",
  "subject": "数学",
  "grade_level": "初中二年级",
  "area": "武汉市洪山区",
  "class_mode": "线下",
  "description": "希望每周末上午，强化计算和应用题",
  "contact_name": "李妈妈",
  "contact_phone": "13900139000"
}
```

**Success flow**  
Show toast "发布成功" → `navigateBack` or `redirectTo /pages/parent/my-demands`

**Error handling**  
Show inline validation messages for any missing required field before submit.

---

### 4.5 View Applications

**Route**: `/pages/parent/view-applications?demandId=5`

**Function**  
Lists all teacher applications for one of the parent's demands. Each application card shows teacher name (`teacher_user_id`), message, status badge, and action buttons.

**API used**: [A2 — GET /api/applies?demand_id=X](#a2--list-applications-for-a-demand-parent)

**Query construction**
```js
GET /api/applies?demand_id=${route.params.demandId}
```

**Displayed fields per card**

| Field | Source |
|-------|--------|
| 申请老师 ID | `apply.teacher_user_id` |
| 申请留言 | `apply.message` |
| 申请状态 | `apply.status` — badge: 待处理 / 已接受 / 已拒绝 |
| 申请时间 | `apply.createdAt` formatted |

**Actions**  
When `apply.status === 'pending'`:
- 接受 button → navigates to `/pages/parent/review-application?applyId=X&action=accepted`
- 拒绝 button → navigates to `/pages/parent/review-application?applyId=X&action=rejected`

---

### 4.6 Accept / Reject Application

**Route**: `/pages/parent/review-application?applyId=X&action=accepted`

**Function**  
Confirms the parent's decision and calls the API to update the application status. This is typically a simple confirmation screen or modal—not a full page in minimal implementations.

**API used**: [A5 — PUT /api/applies/:id](#a5--accept-or-reject-application)

**Request example**
```json
{ "status": "accepted" }
```

**Success flow**  
Show toast "操作成功" → `navigateBack` to view-applications page with list refreshed

**Error handling**
- 404 → "申请不存在"
- 400 → "状态值无效"

---

### 4.7 Teacher Register

**Route**: `/pages/auth/teacher-register`

**Function**  
Two-step registration:
1. Create user account with `role: 'teacher'` (API U1)
2. Immediately create teacher profile (API T1)

On success, stores session and redirects to teacher profile page.

**Step 1 — User creation**

**API used**: [U1 — POST /api/users](#u1--register-user)

| Field | Input type | Required |
|-------|-----------|----------|
| 手机号 `phone` | tel | Yes |
| 昵称 `nickname` | text | No |

`role` hardcoded as `'teacher'`.

**Step 2 — Teacher profile creation**

**API used**: [T1 — POST /api/teachers](#t1--create-teacher-profile)

| Field | Input type | Required |
|-------|-----------|----------|
| 真实姓名 `real_name` | text | Yes |
| 擅长科目 `teaching_subjects` | text | Yes |

`user_id` is taken from step-1 response `data.id`.

**Request example (step 2)**
```json
{
  "user_id": 1,
  "real_name": "张伟",
  "teaching_subjects": "数学,物理"
}
```

**Success flow**  
Store `userId`, `role = 'teacher'`, `teacherId = teacher.id` → `redirectTo /pages/teacher/profile`

---

### 4.8 Teacher Login

**Route**: `/pages/auth/teacher-login`

**Function**  
Existing teacher logs in by phone. On success, fetches the teacher profile associated with the user and stores `teacherId`.

**Step 1 — Login**

**API used**: [U2 — POST /api/users/login](#u2--login)

**Step 2 — Fetch teacher profile list to find matching teacher record**

**API used**: [T2 — GET /api/teachers](#t2--list-teachers)

After login, filter the returned list for `teacher.user_id === user.id` to obtain `teacherId`.

**Alternative (if teacher ID known)**: use [T3 — GET /api/teachers/:id](#t3--get-teacher-by-id) directly.

**Success flow**  
Store `userId`, `role`, `teacherId` → `redirectTo /pages/teacher/home`

---

### 4.9 Teacher Profile

**Route**: `/pages/teacher/profile`

**Function**  
Displays and allows editing of the teacher's own profile. On page load, fetches current teacher data. Editable fields can be saved via PUT.

**APIs used**
- Load: [T3 — GET /api/teachers/:id](#t3--get-teacher-by-id)
- Save: [T4 — PUT /api/teachers/:id](#t4--update-teacher-profile)

**Displayed / editable fields**

| Field | Notes |
|-------|-------|
| `real_name` | 真实姓名 |
| `teaching_subjects` | 擅长科目 (comma-separated) |
| `verification_status` | Read-only badge — 待审核 / 已认证 / 已拒绝 |
| `is_public` | Toggle — 是否公开资料 |

**Update request example**
```json
{
  "teaching_subjects": "数学,物理,化学",
  "is_public": true
}
```

**Success flow**  
Show toast "保存成功" → refresh profile display

---

### 4.10 Browse Demands

**Route**: `/pages/teacher/browse-demands`

**Function**  
Lists all demands with `status: 'open'`. Each card shows key metadata. Tapping a card navigates to the apply page.

**API used**: [D2 — GET /api/demands](#d2--list-demands)

**Note**: The API returns all demands. Front-end should filter client-side to show only `status === 'open'` items, or rely on the full list (backend returns all statuses in MVP).

**Displayed fields per card**

| Field | Label |
|-------|-------|
| `title` | 需求标题 |
| `subject` | 科目 |
| `grade_level` | 年级 |
| `area` | 地区 |
| `class_mode` | 上课方式 |
| `status` | 状态 badge |
| `createdAt` | 发布时间 |

**Action**: Tap card → `navigateTo /pages/teacher/apply-demand?demandId=X`

---

### 4.11 Apply to Demand

**Route**: `/pages/teacher/apply-demand?demandId=X`

**Function**  
Shows demand detail and allows the teacher to submit an application with an optional message.

**APIs used**
- Load demand: [D3 — GET /api/demands/:id](#d3--get-demand-detail)
- Submit application: [A1 — POST /api/applies](#a1--submit-application)

**Demand detail display**

| Field | Label |
|-------|-------|
| `title` | 需求标题 |
| `subject` + `grade_level` | 科目 / 年级 |
| `area` | 上课地区 |
| `class_mode` | 上课方式 |
| `description` | 需求说明 |

**Application form**

| Field | Input type | Required |
|-------|-----------|----------|
| 申请留言 `message` | textarea | No |

`demand_id` comes from the route param. `teacher_user_id` is injected from global state.

**Request example**
```json
{
  "demand_id": 5,
  "teacher_user_id": 1,
  "message": "您好，我是武汉大学数学系在读研究生，有三年家教经验..."
}
```

**Success flow**  
Show toast "申请成功" → `navigateBack`

**Error handling**
- 409 → "您已申请过该需求"
- Disable submit button after success to prevent duplicate submissions

---

## 5. State Management

Use `app.globalData` (WeChat) or Pinia/Vuex store (UniApp) to hold session state. All pages read from this store — do not rely on page-to-page parameter passing for user identity.

### 5.1 Global State Shape

```ts
interface GlobalState {
  userId: number | null;       // Set after login/register; cleared on logout
  role: 'parent' | 'teacher' | 'both' | null;
  teacherId: number | null;    // Set only for teacher users, from Teacher.id
  nickname: string | null;
  avatarUrl: string | null;
}
```

### 5.2 Initialization

```js
// app.js (WeChat) or main.js (UniApp)
App({
  globalData: {
    userId: null,
    role: null,
    teacherId: null,
    nickname: null,
    avatarUrl: null
  },
  onLaunch() {
    const userId = wx.getStorageSync('userId');
    if (userId) {
      this.globalData.userId    = userId;
      this.globalData.role      = wx.getStorageSync('role');
      this.globalData.teacherId = wx.getStorageSync('teacherId') || null;
      this.globalData.nickname  = wx.getStorageSync('nickname') || null;
    }
  }
});
```

### 5.3 Storage Keys

| Key | Value | Persisted |
|-----|-------|-----------|
| `userId` | `number` | Yes (`wx.setStorageSync`) |
| `role` | `'parent'` \| `'teacher'` \| `'both'` | Yes |
| `teacherId` | `number` | Yes (teacher users only) |
| `nickname` | `string` | Yes |

### 5.4 Login / Logout Pattern

```js
// On successful login
function saveSession(user, teacherId = null) {
  const app = getApp();
  app.globalData.userId   = user.id;
  app.globalData.role     = user.role;
  app.globalData.nickname = user.nickname;
  app.globalData.teacherId = teacherId;

  wx.setStorageSync('userId',   user.id);
  wx.setStorageSync('role',     user.role);
  wx.setStorageSync('nickname', user.nickname || '');
  if (teacherId) wx.setStorageSync('teacherId', teacherId);
}

// On logout
function clearSession() {
  const app = getApp();
  Object.assign(app.globalData, { userId: null, role: null, teacherId: null, nickname: null });
  wx.clearStorageSync();
}
```

---

## 6. Development Notes

### 6.1 API Response Contract

Every response from the backend follows this envelope:

```ts
// Success
{ success: true, data: T, message?: string }

// Failure
{ success: false, message: string, errors?: string[] }
```

Always check `res.data.success` before reading `res.data.data`.

### 6.2 Unified Request Helper

```js
// utils/request.js
const BASE_URL = 'http://localhost:3000/api';

export function request({ url, method = 'GET', data = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.data.success) {
          resolve(res.data);
        } else {
          wx.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    });
  });
}
```

### 6.3 GET vs POST Rules

| Case | Rule |
|------|------|
| Fetching a resource by ID | `GET /api/resource/:id` — no body |
| Fetching a filtered list | `GET /api/resource?param=value` — query string only |
| Creating a resource | `POST /api/resource` — all required fields in JSON body |
| Updating a resource | `PUT /api/resource/:id` — only changed fields in JSON body |

### 6.4 Required Fields Checklist

| Endpoint | Required fields |
|----------|----------------|
| POST `/api/users` | `phone`, `role` |
| POST `/api/users/login` | `phone` |
| POST `/api/teachers` | `user_id`, `real_name`, `teaching_subjects` |
| POST `/api/demands` | `title`, `subject`, `grade_level`, `area`, `class_mode`, `description`, `contact_name`, `contact_phone` |
| POST `/api/applies` | `demand_id`, `teacher_user_id` |
| PUT `/api/applies/:id` | `status` |

### 6.5 Enum Values Reference

| Field | Allowed values |
|-------|---------------|
| `user.role` | `'parent'`, `'teacher'`, `'both'` |
| `user.status` | `'active'`, `'inactive'` |
| `teacher.verification_status` | `'pending'`, `'verified'`, `'rejected'` |
| `demand.status` | `'open'`, `'closed'` |
| `apply.status` | `'pending'`, `'accepted'`, `'rejected'` |

### 6.6 Unique Constraint Behavior

- `users.phone` is unique — a 409 response means the phone is already registered
- `applies(demand_id, teacher_user_id)` is unique — a 409 response means the teacher already applied to that demand; disable the apply button in this case

### 6.7 Teacher ID vs User ID

There are two different IDs for a teacher:
- `User.id` — the login account ID, stored as `userId` in global state and used in `teacher_user_id` fields
- `Teacher.id` — the teacher profile record ID, stored as `teacherId`, used in `GET/PUT /api/teachers/:id`

Do not confuse the two. Application records use `teacher_user_id` (the user account ID), not the Teacher profile ID.

### 6.8 Page Navigation Summary

| From | Action | To |
|------|--------|----|
| Home | 家长入口 | `/pages/auth/parent-login` |
| Home | 老师入口 | `/pages/auth/teacher-login` |
| Parent Login | 去注册 | `/pages/auth/parent-register` |
| Parent Register/Login | Success | `/pages/parent/home` |
| Parent Home | 发布需求 | `/pages/parent/publish-demand` |
| Parent Home | 我的需求列表 | `/pages/parent/my-demands` |
| My Demands | 查看申请 | `/pages/parent/view-applications?demandId=X` |
| View Applications | 接受/拒绝 | API call in-page, no navigation |
| Teacher Login | 去注册 | `/pages/auth/teacher-register` |
| Teacher Register/Login | Success | `/pages/teacher/home` |
| Teacher Home | 我的资料 | `/pages/teacher/profile` |
| Teacher Home | 浏览需求 | `/pages/teacher/browse-demands` |
| Browse Demands | 申请接单 | `/pages/teacher/apply-demand?demandId=X` |

---

## 7. Business Flow Diagram

```
╔══════════════════════════════════════════════════════════════════╗
║                        TUTOR MINIAPP FLOW                        ║
╚══════════════════════════════════════════════════════════════════╝

                          ┌───────────┐
                          │   Home    │
                          │  (index)  │
                          └─────┬─────┘
               ┌────────────────┴────────────────┐
               ▼                                 ▼
    ┌─────────────────────┐           ┌─────────────────────┐
    │   PARENT / STUDENT  │           │       TEACHER       │
    └─────────┬───────────┘           └──────────┬──────────┘
              │                                  │
      ┌───────▼────────┐                ┌────────▼───────┐
      │ Register/Login │                │ Register/Login │
      │  POST /users   │                │  POST /users   │
      │  POST /login   │                │  POST /login   │
      └───────┬────────┘                └────────┬───────┘
              │                                  │
              │                         ┌────────▼───────────┐
              │                         │  Create/Edit       │
              │                         │  Teacher Profile   │
              │                         │  POST/PUT /teachers│
              │                         └────────┬───────────┘
              │                                  │
    ┌─────────▼──────────┐             ┌─────────▼──────────┐
    │  Publish Demand    │             │  Browse Demands    │
    │  POST /demands     │             │  GET  /demands     │
    └─────────┬──────────┘             └─────────┬──────────┘
              │                                  │
              │   ┌──────────────────────────────┘
              │   │   Teacher selects a demand
              │   ▼
              │  ┌─────────────────────┐
              │  │  Apply to Demand    │
              │  │  POST /applies      │
              │  └────────┬────────────┘
              │           │
              │           │  Application created (status: pending)
              │           │
    ┌─────────▼───────────▼──┐
    │   View Applications    │
    │   GET /applies         │
    │   ?demand_id=X         │
    └─────────┬──────────────┘
              │
    ┌─────────▼──────────────┐
    │   Accept / Reject      │
    │   PUT /applies/:id     │
    │   { status: accepted   │
    │     | rejected }       │
    └─────────┬──────────────┘
              │
    ┌─────────▼──────────────┐
    │  (Optional) Close      │
    │  Demand after match    │
    │  PUT /demands/:id      │
    │  { status: 'closed' }  │
    └────────────────────────┘


  STATUS LIFECYCLE
  ─────────────────────────────────────────────────────────────

  Demand:   open ──────────────────────────────────► closed

  Apply:    pending ──► accepted
                   └──► rejected

  Teacher:  pending (verification) ──► verified
                                   └──► rejected
```

---

*End of document. For backend schema details see `docs/database.md`. For system architecture see `docs/tech.md`.*
