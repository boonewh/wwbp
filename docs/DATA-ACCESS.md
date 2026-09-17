# Data ownership and access design

This is a proposed schema, not deployed database security.

## Private core

- `workspaces`: one private workspace owned by an authenticated account initially.
- `campaigns`: belongs to a workspace; records external game identifier, player position, variant, and display name.
- `reports`: belongs to a campaign; stores turn, source hash, source text or private object reference, parser version, revision, and parsed representation.
- Future `notes` and `order_drafts`: belong to a private campaign and inherit its access rules.

Use foreign keys and uniqueness constraints to enforce ownership relationships and duplicate rules. Resolve workspace access from the authenticated identity; do not trust a workspace ID supplied by a client. A game number can occur in multiple private workspaces. Owners can only operate on records reachable through their own workspace.

Shared atlas data is independent from private campaign state. Parsed reports remain private even if their underlying map codes are public. Apply the same authorization to raw source, derived views, exports, and any stored objects. RLS must cover both existing rows and proposed inserted/updated rows. Privileged server credentials bypassing RLS need explicit authorization checks and must never be exposed to clients.

## Alliance extension

Proposed later tables: `alliances`, `alliance_memberships`, `alliance_invitations`, `shared_snapshots`, and `sharing_audit_events`. Membership does not grant access to the member's workspace or campaign tables. A snapshot is a deliberately filtered copy with source provenance and audience; recipients read that copy only.

Keep publication separate from report import. Check current alliance membership for every read, including file downloads. Define revocation and snapshot ownership before implementation. Use policy tests for cross-account and cross-alliance attempts, guessed IDs, modified foreign keys, departed members, and expired invitations.

## Decisions before implementation

Choose the invite-only sign-in experience; settle raw text storage in database versus private objects; set account deletion/retention behavior and pilot budget. These do not block migrating the existing UI and parser. Alliance snapshot fields and conflict presentation are decided before implementing sharing.
