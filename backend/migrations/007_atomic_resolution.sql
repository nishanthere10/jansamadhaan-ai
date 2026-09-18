-- Requires migrations 005 and 006. One PostgREST RPC request = one transaction.
BEGIN;
ALTER TABLE public.incident_updates
    ADD COLUMN IF NOT EXISTS resolution_verification_id uuid
        REFERENCES public.resolution_verifications(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_updates_resolution_verification
    ON public.incident_updates(resolution_verification_id)
    WHERE resolution_verification_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.finalize_resolution(
    p_incident_id uuid,
    p_verification_id uuid,
    p_actor_id uuid,
    p_previous_status text,
    p_assigned_to uuid,
    p_outcome text,
    p_confidence double precision,
    p_note text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_incident public.incidents%ROWTYPE;
    v_attempt public.resolution_verifications%ROWTYPE;
    v_role text;
BEGIN
    IF p_outcome IS NULL OR p_outcome NOT IN ('verified', 'rejected', 'error')
       OR p_confidence IS NULL OR NOT (p_confidence BETWEEN 0 AND 1)
       OR p_note IS NULL THEN
        RAISE EXCEPTION 'Invalid verification result' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_incident FROM public.incidents
        WHERE id = p_incident_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('applied', false);
    END IF;
    -- Include null assignment in the concurrency check, even for provider errors.
    IF v_incident.status::text IS DISTINCT FROM p_previous_status
       OR v_incident.assigned_to IS DISTINCT FROM p_assigned_to
       OR v_incident.status::text IN ('resolved', 'closed', 'rejected') THEN
        RETURN jsonb_build_object('applied', false);
    END IF;

    SELECT role::text INTO v_role FROM public.users WHERE id = p_actor_id;
    IF v_role IS NULL OR v_role NOT IN ('authority', 'worker')
       OR (v_role = 'worker' AND v_incident.assigned_to IS DISTINCT FROM p_actor_id) THEN
        RAISE EXCEPTION 'Unauthorized resolution actor' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_attempt FROM public.resolution_verifications
        WHERE id = p_verification_id AND incident_id = p_incident_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('applied', false);
    END IF;
    IF v_attempt.verification_status::text <> 'pending'
       OR v_attempt.before_image_url IS DISTINCT FROM v_incident.image_url
       OR EXISTS (SELECT 1 FROM public.incident_updates
                  WHERE resolution_verification_id = p_verification_id) THEN
        RETURN jsonb_build_object('applied', false);
    END IF;

    IF p_outcome = 'verified' THEN
        UPDATE public.incidents SET status = 'resolved' WHERE id = p_incident_id;
        UPDATE public.resolution_verifications SET verification_status = 'verified',
            verification_score = p_confidence, manual_review_required = false
            WHERE id = p_verification_id;
    ELSIF p_outcome = 'rejected' THEN
        UPDATE public.incidents SET status = 'in-progress' WHERE id = p_incident_id;
        UPDATE public.resolution_verifications SET verification_status = 'rejected',
            verification_score = p_confidence, manual_review_required = true
            WHERE id = p_verification_id;
    ELSE
        UPDATE public.resolution_verifications SET verification_status = 'pending',
            verification_score = 0, manual_review_required = true
            WHERE id = p_verification_id;
    END IF;

    -- Do not catch this error: PostgreSQL must roll back every finalization write.
    INSERT INTO public.incident_updates (
        incident_id, updated_by, status, note, before_image_url, after_image_url,
        resolution_verification_id
    ) SELECT p_incident_id, p_actor_id, status::text, p_note,
             v_attempt.before_image_url, v_attempt.after_image_url, p_verification_id
        FROM public.incidents WHERE id = p_incident_id;

    RETURN jsonb_build_object('applied', true);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_resolution(uuid, uuid, uuid, text, uuid, text, double precision, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_resolution(uuid, uuid, uuid, text, uuid, text, double precision, text)
    TO service_role;
COMMIT;
