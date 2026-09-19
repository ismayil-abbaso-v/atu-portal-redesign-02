-- Enable 'muellim' role in app_role enum
-- NOTE: this must run in its own transaction/migration, separate from any
-- statement that uses the new value — Postgres does not allow a newly added
-- enum value to be referenced in the same transaction it was added in
-- (error 55P04: unsafe use of new value ... New enum values must be
-- committed before they can be used).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'muellim';
