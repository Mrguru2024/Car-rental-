# 🔐 Carsera Roles, Permissions & API Governance (Extended)

This section defines **all platform roles**, their **authority boundaries**, and **how APIs must enforce them**.

These rules are non-negotiable and override any default assumptions by AI agents or contributors.

---

## 1. Role Hierarchy (Highest → Lowest)

1. **Super Admin**
2. **Prime Admin**
3. **Admin**
4. **Dealer**
5. **Renter**

No role may escalate itself.

---

## 2. Role Definitions (Authoritative)

### 2.1 Renter

**Purpose:** Rent vehicles

Capabilities:

- Browse listings
- Create booking intents
- Select insurance or BYOI
- Upload verification documents
- Accept liability (BYOI only)
- File claims
- View own bookings & claims

Restrictions:

- Cannot modify vehicles
- Cannot access admin dashboards
- Cannot view other users’ data

---

### 2.2 Dealer

**Purpose:** Monetize vehicle inventory

Capabilities:

- Create and manage vehicle listings
- Upload vehicle photos
- View bookings for their vehicles
- Submit damage documentation
- View claims related to their vehicles

Restrictions:

- Cannot approve claims
- Cannot approve renters or dealers
- Cannot modify insurance decisions
- Cannot access admin audit logs

---

### 2.3 Admin (Tier 1 Operations)

**Purpose:** Day-to-day platform operations

Capabilities:

- Approve or reject renter verification
- Approve or reject dealer verification
- Review and process claims
- Review and approve BYOI submissions
- Moderate vehicle listings
- View platform activity (read-only)

Restrictions:

- Cannot override Prime Admin decisions
- Cannot modify arbitration outcomes
- Cannot access system configuration
- Cannot impersonate users

Admins **do not assign fault**.

---

### 2.4 Prime Admin (Tier 2 Audit & Oversight)

**Purpose:** Quality control, audits, and escalation handling

Capabilities:

- Audit Admin decisions
- Approve or reverse Admin actions
- Perform second-level review of:
  - Claims
  - BYOI approvals
  - Dealer onboarding
- Access audit logs
- Flag accounts for compliance review
- Lock listings or users pending review

Restrictions:

- Cannot change platform configuration
- Cannot modify Stripe keys or webhooks
- Cannot delete core records
- Cannot impersonate users

Prime Admins act as **checks and balances**, not operators.

---

### 2.5 Super Admin (System Authority)

**Purpose:** Platform ownership and system integrity

Capabilities:

- Full access to all data
- Manage role assignments
- Modify platform configuration
- Manage Stripe integration
- Manage Supabase policies
- View and export all audit logs
- Override any decision
- Freeze accounts globally
- Initiate legal holds

Restrictions:

- None (except internal governance)

Super Admin actions **must be logged and immutable**.

---

## 3. Role Enforcement Rules (API-Level)

### 3.1 Every Protected Endpoint Must:

1. Authenticate user (Supabase JWT)
2. Verify role explicitly
3. Enforce row-level ownership (RLS)
4. Log sensitive actions

Role checks must be **explicit**, not inferred.

---

## 4. Updated Admin API Endpoints (With Roles)

### 4.1 Tier 1 Admin Endpoints

Accessible by: `admin`, `prime_admin`, `super_admin`

Examples:

- `GET /api/admin/verifications`
- `POST /api/admin/verifications/:id/decision`
- `GET /api/admin/byoi`
- `POST /api/admin/claims/:id/status`

---

### 4.2 Prime Admin Audit Endpoints

Accessible by: `prime_admin`, `super_admin`

#### Audit Admin Decisions

**POST** `/api/prime-admin/audits/:entity/:id`

Request:

```json
{
  "action": "approve|reverse|flag",
  "n
```
