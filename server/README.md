# Backend API

Minimal Express + MySQL backend for the tutor marketplace MVP.

## Stack

- Node.js
- Express
- Sequelize
- MySQL
- Multer for identity document uploads

## Structure

```text
server/
  package.json
  README.md
  src/
    app.js
    index.js
    routes.js
    modules/
      user/
      teacher/
      demand/
      apply/
```

Each module contains:

- `*.controller.js`
- `*.service.js`
- `*.route.js`

## Current Scope

- phone login and registration
- teacher profile / demand / apply / favorites / messages
- SMS verification with `mock` and `real` provider switch
- identity verification upload and admin review flow

## Environment

Copy `.env.example` into your runtime environment and adjust values as needed.

Important variables:

- `SMS_PROVIDER=mock` for development
- `SMS_PROVIDER=real` to enable a real provider later
- `SMS_API_URL` and `SMS_API_KEY` are required when `SMS_PROVIDER=real`
- `ADMIN_VERIFY_SECRET` is required by `POST /api/admin/verify/:userId`
- `ADMIN_DEFAULT_USERNAME` and `ADMIN_DEFAULT_PASSWORD` seed the first admin account
- `ADMIN_JWT_SECRET` signs admin login tokens

## Run

```bash
cd server
npm install
npm start
```

## Endpoints

- `GET /health`
- `POST /api/users`
- `POST /api/users/login`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `POST /api/sms/send`
- `POST /api/sms/verify`
- `GET /api/identity/me`
- `POST /api/identity/upload`
- `POST /api/admin/auth/login`
- `GET /api/admin/profile`
- `GET /api/admin/verifications`
- `GET /api/admin/verifications/:id`
- `POST /api/admin/verifications/:id/review`
- `POST /api/admin/verify/:userId`

## Admin Console

After starting the server, open:

```text
http://localhost:3000/admin
```

Default credentials are taken from `.env`:

```text
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=admin123456
```

## SMS APIs

`POST /api/sms/send`

```json
{
  "phone": "13800138001"
}
```

Example response in development:

```json
{
  "success": true,
  "message": "Verification code sent",
  "data": {
    "phone": "13800138001",
    "expires_in": 300,
    "mock_code": "123456",
    "provider": "mock"
  }
}
```

`POST /api/sms/verify`

```json
{
  "phone": "13800138001",
  "code": "123456"
}
```

## Identity APIs

`POST /api/identity/upload`

- requires `Authorization: Bearer <token>`
- requires multipart form data
- field `document_type`: `student_id` or `admission_notice`
- file field name: `document`
- only `.jpg`, `.jpeg`, `.png`
- max file size: `5MB`

`POST /api/admin/verify/:userId`

- requires header `x-admin-secret: <ADMIN_VERIFY_SECRET>`

```json
{
  "status": "approved",
  "review_note": "材料清晰，审核通过"
}
```
