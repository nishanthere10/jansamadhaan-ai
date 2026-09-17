-- Migration 005: Schema Alignment & Helper Columns
-- Run this in your Supabase SQL Editor if you wish to persist worker assignments
-- and track a dedicated incident updates audit trail.

-- 1. Add assigned_to and updated_at to public.incidents (safe idempotent checks)
ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Index assigned_to for fast worker dashboard queries
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON public.incidents(assigned_to);

-- 3. Create incident_updates timeline table (if you want full audit history)
CREATE TABLE IF NOT EXISTS public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  updated_by uuid REFERENCES public.users(id),
  status text NOT NULL,
  note text,
  before_image_url text,
  after_image_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON public.incident_updates(incident_id);
