import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HardHat,
  Info,
  ExternalLink,
  Share2,
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  ShieldAlert,
  Search,
  Check,
  ArrowLeft,
  ImageOff,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SeverityBadge } from '../../components/shared/SeverityBadge';
import { SlaStateBadge } from '../../components/shared/SlaStateBadge';
import { CopyTrackingId } from '../../components/shared/CopyTrackingId';
import { BeforeAfterViewer } from '../../components/shared/BeforeAfterViewer';
import { IncidentTimeline, type TimelineEvent } from '../../components/shared/IncidentTimeline';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { QrProject, PublicTracking, PublicTrackingEvent, ApiResponse } from '../../types';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'var(--cr-amber)' },
  active: { label: 'Active', color: 'var(--cr-blue-mid)' },
  delayed: { label: 'Delayed', color: 'var(--cr-red)' },
  completed: { label: 'Completed', color: 'var(--cr-green)' },
  cancelled: { label: 'Cancelled', color: 'var(--cr-red)' },
};

/** Statuses after which nothing further is expected to happen. */
const TERMINAL_STATUSES = new Set(['resolved', 'closed', 'rejected']);

/** Human wording for the AI verification outcome. */
function verificationNotice(status?: string | null): {
  tone: 'ok' | 'warn' | 'bad' | 'info';
  text: string;
} | null {
  switch ((status || '').toLowerCase()) {
    case 'verified':
      return { tone: 'ok', text: 'Repair verified by AI inspection.' };
    case 'error':
      return {
        tone: 'warn',
        text: 'AI verification could not complete — the repair was not rejected and is pending human review.',
      };
    case 'rejected':
      return {
        tone: 'bad',
        text: 'The submitted repair did not pass verification. Rework has been requested.',
      };
    case 'pending':
      return { tone: 'info', text: 'Verification of the submitted repair is in progress.' };
    default:
      return null;
  }
}

const NOTICE_CLASS: Record<string, string> = {
  ok: 'bg-[var(--cr-green-light)] text-[var(--cr-green)] border-[rgba(26,122,62,0.2)]',
  warn: 'bg-[var(--cr-amber-light)] text-[var(--cr-amber)] border-[rgba(146,64,14,0.25)]',
  bad: 'bg-[var(--cr-red-light)] text-[var(--cr-red)] border-[rgba(185,28,28,0.2)]',
  info: 'bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] border-[rgba(0,85,164,0.2)]',
};

/**
 * Convert the backend's citizen_visible_timeline into timeline UI events.
 * This renders EXACTLY what the server recorded — no invented steps. The
 * current status is marked "active" unless it is terminal.
 */
function toTimelineEvents(
  timeline: PublicTrackingEvent[],
  currentStatus: string
): TimelineEvent[] {
  const isTerminal = TERMINAL_STATUSES.has(currentStatus);
  return timeline.map((entry, index) => {
    const isCurrent = entry.status === currentStatus && !isTerminal;
    // Last entry of a terminal timeline is complete; everything else follows
    // its position relative to the current status.
    const stepStatus: TimelineEvent['status'] = isCurrent
      ? 'active'
      : isTerminal
      ? 'complete'
      : 'complete';
    const label = STATUS_LABEL[entry.status]?.label ?? entry.status;
    return {
      id: `tl-${index}`,
      label: entry.status === currentStatus ? `Status: ${label}` : label,
      detail: entry.note || undefined,
      timestamp: entry.time,
      status: stepStatus,
    };
  });
}

export default function QrTracker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<QrProject | null>(null);
  const [incident, setIncident] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 503 from the public endpoint: tracking disabled server-side (migration 009
  // pending). Distinct from a transient network failure — reloading cannot fix
  // it, so the empty-state action offered differs.
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [lookupValue, setLookupValue] = useState('');

  useEffect(() => {
    if (!id) {
      // No id in the path: `/track` renders the tracking-ID lookup form.
      setLoading(false);
      setProject(null);
      setIncident(null);
      setNotFound(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setServiceUnavailable(false);
    setProject(null);
    setIncident(null);

    (async () => {
      try {
        // 1. A QR project board?
        const projectRes = await fetch(`/api/v1/qr-projects/${encodeURIComponent(id)}`);
        if (projectRes.ok) {
          const json: ApiResponse<QrProject> = await projectRes.json();
          if (isMounted && json.success && json.data) {
            setProject(json.data);
            return;
          }
        }

        // 2. Otherwise a public incident token?
        const incRes = await fetch(
          `/api/v1/incidents/public/track/${encodeURIComponent(id)}`
        );

        // Migration 009 pending: say so plainly instead of showing "not found".
        if (incRes.status === 503) {
          const body = await incRes.json().catch(() => ({}));
          if (isMounted) {
            setServiceUnavailable(true);
            setError(
              body?.detail || 'Public tracking is not enabled on this deployment yet.'
            );
          }
          return;
        }

        if (incRes.ok) {
          const data: PublicTracking = await incRes.json();
          if (isMounted && data?.tracking_id) {
            setIncident(data);
            return;
          }
        }

        if (isMounted) setNotFound(true);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleLookup = (event: React.FormEvent) => {
    event.preventDefault();
    const raw = lookupValue.trim();
    if (!raw) return;
    // Accept a pasted share link as well as a bare tracking token.
    const marker = '/track/';
    const token = raw.includes(marker)
      ? raw.split(marker).pop()!.split(/[?#]/)[0]
      : raw;
    if (token) navigate(`/track/${encodeURIComponent(token)}`);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: `Jan Samadhan Public Tracker — ${incident?.title || project?.title || 'Report'}`,
          text: `Check live public status on Jan Samadhan Transparency Portal:`,
          url,
        })
        .catch(() => {
          // fallback
        });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const title = incident?.title || project?.title || 'Public Civic Issue';
    const text = `Live Tracking for: ${title} on Jan Samadhan Portal: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── Tracking-ID lookup (route `/track` with no id) ──
  // The landing page's "Track" link used to point at `/track/demo`, which
  // always rendered "Public Record Not Found". This gives it a real entry point.
  if (!id) {
    return (
      <div className="min-h-screen cr-auth-bg flex flex-col">
        <div className="cr-tricolor-bar" />
        <header className="bg-[var(--cr-authority)] text-white px-6 py-6 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center font-black text-sm">
                JS
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                  Jan Samadhan Public Tracker
                </span>
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Track a Complaint
                </h1>
              </div>
            </div>
            <Link to="/" className="text-xs font-semibold text-white/80 hover:text-white underline">
              Home
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-start justify-center p-4 sm:p-6">
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-[var(--cr-border)] shadow-sm overflow-hidden">
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--cr-blue-light)', color: 'var(--cr-blue-mid)' }}
                  >
                    <Search size={18} aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-[var(--cr-text)]">
                      Enter your tracking ID
                    </h2>
                    <p className="text-[13px] text-[var(--cr-text-muted)] mt-1 leading-relaxed">
                      Use the ID from your complaint receipt (for example{' '}
                      <span className="font-mono font-semibold">CIV-…</span>) or paste the
                      full tracking link a neighbour shared with you.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLookup} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tracking-lookup">Tracking ID or link</Label>
                    <Input
                      id="tracking-lookup"
                      value={lookupValue}
                      onChange={(e) => setLookupValue(e.target.value)}
                      placeholder="CIV-1758300000-A1B2 or https://…/track/…"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="authority"
                    className="w-full"
                    disabled={!lookupValue.trim()}
                  >
                    <Search size={16} className="mr-2" aria-hidden />
                    Track Complaint
                  </Button>
                </form>

                <p className="text-[12px] text-[var(--cr-text-muted)] border-t border-[var(--cr-border)] pt-4">
                  Complaints tagged with a QR code on a civic project site open
                  directly — just scan the code.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center cr-auth-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen cr-auth-bg flex items-center justify-center p-6">
        <EmptyState
          title={serviceUnavailable ? 'Tracking Unavailable' : 'Could Not Load Record'}
          description={error}
          action={
            serviceUnavailable ? (
              // 503 = tracking disabled server-side (migration pending);
              // reloading cannot fix it, so navigate instead of retrying.
              <Button asChild variant="authority">
                <Link to="/">
                  <ArrowLeft size={16} className="mr-1.5" /> Return to Home
                </Link>
              </Button>
            ) : (
              <Button variant="authority" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            )
          }
        />
      </div>
    );
  }

  // ── Not Found ──
  if (notFound || (!project && !incident)) {
    return (
      <div className="min-h-screen cr-auth-bg flex items-center justify-center p-6">
        <EmptyState
          title="Public Record Not Found"
          description="This tracking link does not map to an active public project or civic incident. Please check the ID or QR code."
          action={
            <Button asChild variant="authority">
              <Link to="/">
                <ArrowLeft size={16} className="mr-1.5" /> Return to Home
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // ─── 1. PUBLIC INCIDENT TRACKER PER SPEC §17 ─────────────────
  if (incident) {

    // Render ONLY what the database recorded. The previous implementation
    // hardcoded a 5-step story, so every visitor was told a field crew was
    // mid-repair even for incidents nobody had opened.
    const events = toTimelineEvents(
      incident.citizen_visible_timeline ?? [],
      incident.status
    );
    const notice = verificationNotice(incident.verification_status);
    const hasBefore = Boolean(incident.image_url);
    const hasAfter = Boolean(incident.resolution_image);

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        <div className="cr-tricolor-bar" />

        {/* Civic Header */}
        <header className="bg-[var(--cr-authority)] text-white px-6 py-6 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center font-black text-sm">
                JS
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                  Jan Samadhan Public Tracker
                </span>
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Citizen Grievance Transparency Portal
                </h1>
              </div>
            </div>
            <Link to="/" className="text-xs font-semibold text-white/80 hover:text-white underline">
              Home
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Incident Overview Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={incident.status} />
                  <SeverityBadge severity={incident.severity} />
                </div>
                <CopyTrackingId trackingId={incident.tracking_id} className="font-mono text-xs" />
              </div>

              {/* Server-computed SLA. Was previously absent from this page. */}
              <SlaStateBadge state={incident.sla_state} dueAt={incident.sla_due_at} />

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {incident.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {incident.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
                {incident.location_label && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" aria-hidden />
                    <span>{incident.location_label}</span>
                  </span>
                )}
                {incident.department && (
                  <span className="flex items-center gap-1.5">
                    <Building size={14} className="text-slate-400" />
                    <span>Dept: {incident.department}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>
                    {new Date(incident.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Verification outcome banner (only when AI ran) */}
          {notice && (
            <div
              role="status"
              className={`rounded-lg border px-4 py-3 text-[13px] font-semibold flex items-start gap-2 ${NOTICE_CLASS[notice.tone]}`}
            >
              {notice.tone === 'ok' ? (
                <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
              ) : (
                <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {/* Before / After Evidence Viewer — only when BOTH photos exist.
              Previously the "after" slot silently reused the "before" photo,
              implying a repair had happened when only one photo existed. */}
          {hasBefore && hasAfter && (
            <Card className="border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50/20 p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <ShieldCheck size={18} className="text-emerald-600" aria-hidden />
                <span>Before &amp; After — Photographic Evidence</span>
              </div>
              <BeforeAfterViewer
                beforeSrc={incident.image_url!}
                afterSrc={incident.resolution_image!}
                beforeLabel="Reported Issue"
                afterLabel="After Repair"
                aiVerified={incident.verification_status === 'verified'}
              />
            </Card>
          )}
          {hasBefore && !hasAfter && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center gap-2 text-slate-500 text-[13px]">
                <ImageOff size={16} aria-hidden />
                <span>
                  Original report photo attached. No post-repair photo has been
                  submitted yet.
                </span>
              </div>
            </Card>
          )}

          {/* Vertical Audit Trail Timeline per spec §17 */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
              Official Resolution Timeline
            </h3>
            {events.length > 0 ? (
              <IncidentTimeline events={events} />
            ) : (
              <p className="text-[13px] text-slate-500">
                No status updates have been recorded yet. This page will update
                automatically as the department works on the complaint.
              </p>
            )}
          </Card>

          {/* Social Share & Reassurance */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-semibold"
              onClick={handleWhatsAppShare}
            >
              Share via WhatsApp
            </Button>
            <Button
              variant="authority"
              className="flex-1 font-semibold"
              onClick={handleShare}
            >
              {copiedShare ? (
                <>
                  <Check size={16} className="mr-1.5 text-emerald-300" /> Link Copied!
                </>
              ) : (
                <>
                  <Share2 size={16} className="mr-1.5" /> Share Public Status
                </>
              )}
            </Button>
          </div>

          <Link
            to="/"
            className="block text-center text-[13px] font-semibold text-[var(--cr-blue-mid)] hover:underline py-2"
          >
            Report another issue →
          </Link>
        </main>
      </div>
    );
  }

  // ─── 2. VERIFIED GOVERNMENT PROJECT TRACKER ──────────────────
  const statusInfo = STATUS_LABEL[project.status] ?? {
    label: project.status,
    color: 'var(--cr-text-muted)',
  };
  const progress = Math.min(100, Math.max(0, project.progress_percentage));

  return (
    <div className="min-h-screen cr-auth-bg">
      <div className="cr-tricolor-bar" />

      {/* Header */}
      <div style={{ backgroundColor: 'var(--cr-blue)' }} className="text-white px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md overflow-hidden bg-[var(--cr-blue-mid)] flex items-center justify-center font-bold text-sm">
              JS
            </div>
            <div>
              <h1 className="font-bold text-[16px] uppercase tracking-wider text-[var(--cr-orange)]">
                Verified Government Project
              </h1>
              <p className="text-[12px] text-white/60 mt-0.5">
                Jan Samadhan — Transparency Portal
              </p>
            </div>
          </div>
          <Link to="/" className="text-xs text-white/80 hover:text-white underline">
            Home
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-20 space-y-5">
        {/* Project card */}
        <motion.div
          className="cr-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-[20px] font-bold text-[var(--cr-text)] leading-snug">
              {project.title}
            </h2>
            <span
              className="text-[12px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
              style={{
                color: statusInfo.color,
                borderColor: statusInfo.color,
                backgroundColor: `${statusInfo.color}14`,
              }}
            >
              {statusInfo.label}
            </span>
          </div>

          <p className="text-[13.5px] text-[var(--cr-text-muted)] mb-5">
            {project.description}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg flex-shrink-0"
                style={{ backgroundColor: 'var(--cr-blue-light)' }}
              >
                <HardHat size={16} style={{ color: 'var(--cr-blue-mid)' }} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--cr-text-muted)] uppercase font-bold tracking-wide">
                  Department
                </p>
                <p className="font-semibold text-[13px] text-[var(--cr-text)]">
                  {project.department}
                </p>
              </div>
            </div>

            {project.budget != null && (
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'var(--cr-blue-light)' }}
                >
                  <Info size={16} style={{ color: 'var(--cr-blue-mid)' }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--cr-text-muted)] uppercase font-bold tracking-wide">
                    Approved Budget
                  </p>
                  <p className="font-semibold text-[13px] text-[var(--cr-text)]">
                    ₹{project.budget.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress card */}
        <motion.div
          className="cr-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <p className="cr-section-title mb-3">Completion Status</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--cr-text-muted)]">Overall Progress</span>
            <span className="text-[20px] font-bold" style={{ color: 'var(--cr-blue-mid)' }}>
              {progress}%
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--cr-border)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: 'var(--cr-blue-mid)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[13px] text-[var(--cr-text-muted)] mb-3">
            Spot a defect or delay with this civic project?
          </p>
          <Link to="/signup" className="cr-btn cr-btn-primary inline-flex items-center gap-2">
            <ExternalLink size={15} />
            File Grievance via Jan Samadhan
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
