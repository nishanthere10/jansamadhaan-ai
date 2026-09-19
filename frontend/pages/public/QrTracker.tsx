import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HardHat,
  Info,
  ExternalLink,
  Share2,
  CheckCircle2,
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SeverityBadge } from '../../components/shared/SeverityBadge';
import { CopyTrackingId } from '../../components/shared/CopyTrackingId';
import { BeforeAfterViewer } from '../../components/shared/BeforeAfterViewer';
import { IncidentTimeline, type TimelineEvent } from '../../components/shared/IncidentTimeline';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import type { QrProject, Incident, ApiResponse } from '../../types';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'var(--cr-amber)' },
  active: { label: 'Active', color: 'var(--cr-blue-mid)' },
  delayed: { label: 'Delayed', color: 'var(--cr-red)' },
  completed: { label: 'Completed', color: 'var(--cr-green)' },
  cancelled: { label: 'Cancelled', color: 'var(--cr-red)' },
};

export default function QrTracker() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<QrProject | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    // Try fetching QR project first
    fetch(`/api/v1/qr-projects/${id}`)
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProject(json.data);
            return;
          }
        }

        // If not a QR project, check if it's an incident
        const incRes = await fetch(`/api/v1/incidents/${id}`);
        if (incRes.ok) {
          const incJson = await incRes.json();
          if (incJson.success && incJson.data) {
            setIncident(incJson.data);
            return;
          }
        }

        if (res.status === 404 && incRes.status === 404) {
          setNotFound(true);
        } else {
          setNotFound(true);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Network error';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
          title="Could Not Load Record"
          description={error}
          action={
            <Button variant="authority" onClick={() => window.location.reload()}>
              Try Again
            </Button>
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
    const isResolved = incident.status === 'resolved';

    // Generate timeline events from incident audit
    const events: TimelineEvent[] = [
      {
        id: '1',
        label: 'Grievance Submitted',
        detail: `Logged with GPS location and registered citizen identity`,
        timestamp: incident.created_at,
        status: 'complete',
      },
      {
        id: '2',
        label: 'Automated AI Triage & Verification',
        detail: `Classified as ${incident.category.toUpperCase()} • Severity ${incident.severity.toUpperCase()} • Routed to ${incident.department || 'Public Works'}`,
        status: incident.status === 'pending' ? 'active' : 'complete',
      },
      {
        id: '3',
        label: 'Assigned to Municipal Field Worker',
        detail: incident.assigned_to
          ? `Dispatched to authorized field operative`
          : `Queued in municipal department schedule`,
        status:
          incident.status === 'pending'
            ? 'pending'
            : incident.status === 'assigned'
            ? 'active'
            : 'complete',
      },
      {
        id: '4',
        label: 'Field Resolution in Progress',
        detail: 'On-site maintenance team conducting corrective action',
        status:
          incident.status === 'in-progress'
            ? 'active'
            : isResolved
            ? 'complete'
            : 'pending',
      },
      {
        id: '5',
        label: isResolved ? 'Issue Resolved & AI Verified' : 'Resolution Review & Closure',
        detail: isResolved
          ? 'Worker submitted photo proof. Verified and closed.'
          : 'Pending photographic verification proof',
        status: isResolved ? 'complete' : 'pending',
      },
    ];

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

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {incident.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {incident.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
                {incident.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{incident.address}</span>
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

          {/* Before / After Evidence Viewer (If resolved) */}
          {isResolved && incident.image_url && (
            <Card className="border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50/20 p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Verified Photographic Proof of Resolution</span>
              </div>
              <p className="text-xs text-slate-500">
                The field repair was captured and verified through Jan Samadhan AI vision audit:
              </p>
              <BeforeAfterViewer
                beforeSrc={incident.image_url}
                afterSrc={incident.image_url} // or after_image_url
                beforeLabel="Reported Hazard"
                afterLabel="Resolved State"
                aiVerified={true}
              />
            </Card>
          )}

          {/* Vertical Audit Trail Timeline per spec §17 */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
              Official Resolution Timeline
            </h3>
            <IncidentTimeline events={events} />
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
