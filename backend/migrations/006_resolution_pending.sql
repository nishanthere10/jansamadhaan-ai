-- Apply after 005, before deploying the mandatory verification handler.
-- Existing deployments must inspect constraint/type compatibility before rollout.
BEGIN;
CREATE TABLE IF NOT EXISTS public.resolution_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    before_image_url text NOT NULL,
    after_image_url text NOT NULL,
    verification_score double precision NOT NULL DEFAULT 0,
    verification_status text NOT NULL DEFAULT 'pending',
    manual_review_required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- Preserve existing data; fail rather than silently accept unknown legacy states.
ALTER TABLE public.resolution_verifications
    DROP CONSTRAINT IF EXISTS resolution_verifications_verification_status_check;
ALTER TABLE public.resolution_verifications
    ADD CONSTRAINT resolution_verifications_verification_status_check
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));
CREATE INDEX IF NOT EXISTS idx_resolution_verifications_incident
    ON public.resolution_verifications(incident_id, created_at DESC);
ALTER TABLE public.resolution_verifications ENABLE ROW LEVEL SECURITY;
-- Backend service-role only: clients must not forge verification results.
REVOKE ALL ON public.resolution_verifications FROM anon, authenticated;
GRANT ALL ON public.resolution_verifications TO service_role;
COMMIT;
