import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Share2, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { fetchWithAuth } from '../../lib/api';

export default function CitizenReceipt() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/v1/incidents/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setIncident(json.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Incident Not Found</h2>
        <Link to="/citizen" className="text-blue-500 hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const trackingLink = `${window.location.origin}/track/${incident.public_tracking_token || incident.id}`;

  const handleCopyTrackingId = () => {
    navigator.clipboard.writeText(incident.tracking_id);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `I've submitted a civic complaint via Jan Samadhan.\nTracking ID: ${incident.tracking_id}\nTrack live status here: ${trackingLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto p-4 py-12 space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm border-8 border-emerald-50 dark:border-emerald-900/10">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Complaint Submitted
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Your grievance has been securely registered in the Jan Samadhan system.
        </p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Official Grievance ID
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {incident.tracking_id}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopyTrackingId} title="Copy ID">
              {copiedTracking ? <Check className="text-emerald-500" /> : <Copy />}
            </Button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Public Tracking Link
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Use this link to track your complaint's live status without needing to log in. You can also share it with neighbors or local authorities.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md text-xs truncate border border-slate-200 dark:border-slate-700">
                  {trackingLink}
                </code>
                <Button variant="secondary" onClick={handleCopyLink} className="flex-shrink-0">
                  {copiedLink ? <Check size={16} className="mr-1.5 text-emerald-500" /> : <Copy size={16} className="mr-1.5" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button variant="outline" className="flex-1 py-6" onClick={handleWhatsAppShare}>
          <Share2 size={18} className="mr-2 text-emerald-600" />
          Share via WhatsApp
        </Button>
        <Button asChild className="flex-1 py-6" variant="authority">
          <Link to="/citizen">
            Go to My Dashboard
            <ArrowRight size={18} className="ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
