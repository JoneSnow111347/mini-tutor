# Backend Scaffold

Minimal Express backend scaffold for the tutor marketplace MVP.

## Stack

- Node.js
- Express

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

- Only scaffolded structure
- No real business logic
- Placeholder endpoints return `501 Not Implemented`

## Run

```bash
cd server
npm install
npm start
```

## Endpoints

- `GET /health`
- `GET /api/users`
- `GET /api/teachers`
- `GET /api/demands`
- `GET /api/applies`
