-- Phase 3: Add Incident Clustering Columns
-- Run this migration in Supabase SQL Editor

-- Add cluster metadata columns to incidents table
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS cluster_id UUID NULL,
ADD COLUMN IF NOT EXISTS is_primary_incident BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

-- Index for fast cluster lookups
CREATE INDEX IF NOT EXISTS idx_incidents_cluster_id ON incidents(cluster_id);
CREATE INDEX IF NOT EXISTS idx_incidents_primary ON incidents(is_primary_incident) WHERE is_primary_incident = true;

-- Index for duplicate detection candidate queries (category + status + date)
CREATE INDEX IF NOT EXISTS idx_incidents_dedup_lookup 
ON incidents(ai_category, status, created_at) 
WHERE status NOT IN ('resolved', 'rejected');
