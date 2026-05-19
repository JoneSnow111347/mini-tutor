# Local Feature Test Notes

## File placement

- Backend API modules live under `server/src/modules/*`.
- Shared backend middleware is under `server/src/middleware`.
- Mini Program runtime config is `apps/miniapp/src/config/config.js`.
- Mini Program request wrapper is `apps/miniapp/utils/request.js`.
- The teacher profile, identity verification, login/register, demand publish, and demand browse pages are under `apps/miniapp/pages/*`.

## Backend local run

1. Open a VS Code terminal in `server`.
2. Install dependencies if needed with `npm install`.
3. Run `npm run migrate` once if you already have an older database schema.
4. Start the backend with `npm start`.
5. Confirm `http://127.0.0.1:3000/health` returns `success: true`.

## Mini Program local run

1. In `apps/miniapp/src/config/config.js`, keep `ACTIVE_TARGET = 'local'`.
2. Open `apps/miniapp` in WeChat DevTools.
3. Rebuild and clear cache if DevTools still shows old request logic.

## SMS login and registration

- Use the send-code button on the register page or identity page.
- In mock mode (`SMS_PROVIDER=mock`), the backend returns `mock_code` from `/api/sms/send`.
- Enter that code to finish registration or SMS verification.
- To switch to production later, set `SMS_PROVIDER=production` and provide `SMS_API_KEY` plus `SMS_API_URL`.

## Teacher identity verification

1. Register a teacher account.
2. Complete the teacher profile on `/pages/teacher-profile/edit-teacher`.
3. Upload a student ID or admission notice image.
4. Verify in MySQL that:
   - `identity_verifications.status = 'pending'`
   - `users.identity_status = 'pending'`
   - `teachers.verification_status = 'pending'`

## Admin review

1. Open `http://127.0.0.1:3000/admin`.
2. Login with the default admin from env, or fallback:
   - username: `admin`
   - password: `admin123456`
3. Review a pending record and approve or reject it.
4. Confirm the teacher account updates:
   - approved -> `users.identity_status = 'approved'`, `teachers.verification_status = 'verified'`
   - rejected -> `users.identity_status = 'rejected'`, `teachers.verification_status = 'rejected'`

## Verified teacher access guard

- Before approval, try applying for a parent demand from the teacher side.
- The frontend should show a blocked message.
- The backend should also reject `POST /api/applies` with `403`.

## Demand map flow

1. On `pages/publish-demand/publish-demand`, click the location picker.
2. Save a demand with address and coordinates.
3. On `pages/browse-demands/browse-demands`, confirm the demand shows:
   - address text when present
   - distance when location permission is granted
   - a map action that opens `wx.openLocation`

## PM2 deployment

- PM2 config file: `server/ecosystem.config.js`
- Start with `npm run pm2:start`
- Restart with `npm run pm2:restart`
- The app is pinned to port `3000` in the PM2 env block.
- Use `pm2 ls` and `pm2 logs tutor-miniapp-server` to confirm there are no duplicate or zombie processes.
