-- Migration 008: DB-maintained updated_at for public.incidents
-- Requires migrations 004/005 (which add the column).
--
-- 005 adds `updated_at` with an INSERT default only, so the timestamp never
-- changes afterwards. The Phase 4 field map keeps the application out of the
-- timestamp write path; correctness therefore belongs in the database.
-- Run this in the Supabase SQL Editor.

BEGIN;

-- 1. Guarantee the column exists even if 005 was applied partially.
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Attach an UPDATE trigger so every modification refreshes the timestamp.
CREATE OR REPLACE FUNCTION public.set_incidents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incidents_set_updated_at ON public.incidents;
CREATE TRIGGER trg_incidents_set_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_incidents_updated_at();

COMMIT;

-- Rollback (manual, review before running):
--   DROP TRIGGER IF EXISTS trg_incidents_set_updated_at ON public.incidents;
--   DROP FUNCTION IF EXISTS public.set_incidents_updated_at();