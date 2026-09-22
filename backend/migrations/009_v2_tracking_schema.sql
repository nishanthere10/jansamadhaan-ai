-- Migration 009: V2 Public Tracking Schema
-- Adds a high-entropy public token to incidents for safe public tracking

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS public_tracking_token uuid DEFAULT gen_random_uuid();

-- Create a unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_tracking_token ON public.incidents(public_tracking_token);
