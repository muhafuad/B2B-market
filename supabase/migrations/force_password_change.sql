/*
# Force Password Change for Supplier Accounts

## Changes
1. Adds `must_change_password` boolean column to `profiles` table (defaults to false)
   - When admin creates a supplier account, the edge function sets this to true
   - The supplier is forced to change their password on first login before accessing the dashboard
2. Adds RLS policy so authenticated users can read their own `must_change_password` flag
   (existing profiles policies already cover SELECT/UPDATE for own profile)

## Security
- The column is readable by the profile owner (via existing SELECT policy)
- The column is updatable by the profile owner (via existing UPDATE policy)
- No new policies needed — existing profile RLS covers it

## Notes
- Default is false so existing profiles are not affected
- The edge function `create-supplier-account` sets this to true on new supplier accounts
- After the supplier changes their password, the flag is cleared to false
*/

alter table public.profiles add column if not exists must_change_password boolean not null default false;
