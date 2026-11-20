# Security Specification — KaryaSync HRM Firestore Rules

## 1. Data Invariants
1. **Identity & Email Verification**: All read/write operations require an authenticated Firebase user with `request.auth.token.email_verified == true`.
2. **Admin Privilege Protection**: Non-admin users cannot create/modify `admins`, `positions`, `work_schedules`, or promote their own `employees.role` to `'manager'`.
3. **PII & Ownership Isolation**: Every document in `employees`, `attendance`, `attendance_photos`, `leave_requests`, and `payroll_records` stores `ownerUid`. Non-admins may only list/get documents where `resource.data.ownerUid == request.auth.uid`.
4. **Immutable Audit Timestamps**: Every `create` requires `createdAt == request.time && updatedAt == request.time` (or `createdAt == request.time` for immutable photo docs), and every `update` requires `createdAt == existing().createdAt && updatedAt == request.time`.
5. **Terminal State Locking**:
   - Once `leave_requests.status` reaches `'Disetujui'` or `'Ditolak'`, non-admins cannot mutate the request. Only admins may transition status from `'Menunggu'`.
   - Once `attendance.checkOutTime` is non-empty, non-admins cannot re-overwrite Check-out fields.
   - Once `payroll_records.paymentStatus` is `'Dibayar'`, only admins can modify it.
6. **Payload Size & Path Guarding**: Every document ID passes `isValidId()` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars) and every string field has an explicit `.size()` upper bound.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated write to `/positions/pos_1` (`request.auth == null`).
2. Unverified email user (`email_verified: false`) attempting to create `/attendance/att_1`.
3. Non-admin employee attempting to create `/positions/pos_hack` with `dailyRate: 9999999`.
4. Non-admin employee attempting to self-assign `role: "manager"` when creating `/employees/emp_self`.
5. Non-admin employee attempting to update their own `dailyRate` in `/employees/emp_self`.
6. Non-admin employee attempting to read or list `/employees` belonging to another `ownerUid`.
7. Non-admin employee attempting to update `/leave_requests/leave_1` `status` from `"Menunggu"` to `"Disetujui"`.
8. Non-admin employee attempting to modify a `"Disetujui"` leave request (terminal state violation).
9. Client attempting to inject a shadow field `isSuperAdmin: true` in `/attendance/att_1` create or update.
10. Client spoofing `createdAt` with a past client timestamp instead of `request.time`.
11. Client injecting a >140KB payload into `/attendance_photos/photo_1` (`imageDataUrl.size() > 140000`).
12. Client using an oversized/invalid document ID (`../hack` or 200-char ID) on single-doc operations.
