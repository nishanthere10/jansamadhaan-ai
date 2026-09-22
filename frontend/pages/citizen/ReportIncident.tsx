import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import {
  AlertTriangle,
  Trash2,
  Droplets,
  Lightbulb,
  Waves,
  Zap,
  TreePine,
  HelpCircle,
  Camera,
  MapPin,
  Mic,
  MicOff,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  Check,
  Send,
  Navigation,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

import { useTranslation } from '../../lib/useTranslation';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet marker icon issue in React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickMarker({
  position,
  onSelect,
}: {
  position: [number, number] | null;
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={position} /> : null;
}

interface CategoryOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: 'pothole',
    label: 'Pothole & Road Hazard',
    description: 'Road damage, craters, broken asphalt',
    icon: AlertTriangle,
  },
  {
    value: 'garbage',
    label: 'Garbage & Waste',
    description: 'Overflowing bins, dumping, litter',
    icon: Trash2,
  },
  {
    value: 'water-leakage',
    label: 'Water & Drainage',
    description: 'Pipe leak, contaminated water, open drain',
    icon: Droplets,
  },
  {
    value: 'broken-streetlight',
    label: 'Streetlight & Lighting',
    description: 'Dark streets, broken lamp, flickering',
    icon: Lightbulb,
  },
  {
    value: 'flooding',
    label: 'Waterlogging & Flood',
    description: 'Monsoon flooding, submerged street',
    icon: Waves,
  },
  {
    value: 'electricity',
    label: 'Electrical Danger',
    description: 'Sparking wire, transformer hazard',
    icon: Zap,
  },
  {
    value: 'fallen-tree',
    label: 'Fallen Tree / Blockage',
    description: 'Blocked road, fallen branches',
    icon: TreePine,
  },
  {
    value: 'other',
    label: 'Other Civic Issue',
    description: 'Encroachment, noise, sanitation',
    icon: HelpCircle,
  },
];

const SUGGESTED_SNIPPETS = [
  'Causing major traffic jam during peak hours',
  'Deep hazard endangering two-wheelers and pedestrians',
  'Unaddressed for over 3 days, causing bad odor',
  'Critical safety risk at night due to poor visibility',
];

type ReportStep = 1 | 2 | 3 | 4 | 5;

export default function ReportIncident() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();

  // 5-step conversational flow
  const [currentStep, setCurrentStep] = useState<ReportStep>(1);

  // Form states
  const [category, setCategory] = useState<string>('pothole');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Aux / Flow states
  const [uploading, setUploading] = useState<boolean>(false);
  const [aiImageChecking, setAiImageChecking] = useState<boolean>(false);
  const [aiImageStatus, setAiImageStatus] = useState<'verified' | 'unverified' | null>(null);
  const [gpsDetecting, setGpsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // AI categorization suggestions
  const [aiTitle, setAiTitle] = useState<string>('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-reverse geocode handler
  const handleSelectCoordinates = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(`Area near (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `/api/v1/incidents/reverse-geocode?lat=${lat}&lon=${lng}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const data = await res.json();
      if (data && data.address) {
        setAddress(data.address);
      }
    } catch {
      // Retain coordinate fallback
    }
  };

  // GPS auto-detection
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError(null);
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsDetecting(false);
        await handleSelectCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsDetecting(false);
        setError(`Unable to detect GPS: ${err.message}. Please tap on the map to place your pin.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Voice recording logic
  const toggleRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recording is not supported in this browser. Please type directly.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setRecordingStatus('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLanguage.speechCode;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setRecordingStatus('idle');
      };
      recognition.onend = () => {
        setIsRecording(false);
        setRecordingStatus('idle');
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setRecordingStatus('recording');
    } catch (e) {
      console.error(e);
      setIsRecording(false);
      setRecordingStatus('idle');
    }
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      setError('Only image files (JPEG, PNG, WebP) are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }

    setUploading(true);
    setAiImageChecking(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchWithAuth('/api/v1/incidents/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success && json.data?.image_url) {
        setImageUrl(json.data.image_url);
        setAiImageStatus('verified');
      } else {
        throw new Error(json.detail || json.message || 'Image upload failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed.';
      setError(msg);
      setAiImageStatus(null);
    } finally {
      setUploading(false);
      setAiImageChecking(false);
      e.target.value = '';
    }
  };

  // Run AI classification ahead of step 5
  const triggerAiClassification = async () => {
    if (!description.trim()) return;
    setIsAnalyzingAi(true);
    try {
      const res = await fetchWithAuth('/api/v1/ai/classify', {
        method: 'POST',
        body: JSON.stringify({ text: description }),
      });
      const data = await res.json();
      if (res.ok && data) {
        if (data.generated_title) {
          setAiTitle(data.generated_title);
        }
      }
    } catch {
      // Fallback silently if AI classify is offline
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Navigate steps with validation
  const goToStep = (step: ReportStep) => {
    setError(null);
    if (step === 2 && !category) {
      setError('Please select a category to continue.');
      return;
    }
    if (step === 3 && !description.trim()) {
      setError('Please describe what happened before proceeding.');
      return;
    }
    if (step === 5) {
      if (!address.trim()) {
        setError('Please confirm or enter a location address.');
        return;
      }
      triggerAiClassification();
    }
    setCurrentStep(step);
  };

  // Submit report
  const handleSubmitReport = async () => {
    setError(null);
    setIsSubmitting(true);

    const activeCat = CATEGORIES.find((c) => c.value === category);
    const resolvedTitle = aiTitle || `${activeCat?.label || 'Civic Issue'} Report`;

    const payload = {
      title: resolvedTitle,
      category: category.toLowerCase(),
      description,
      address,
      location_lat: latitude,
      location_lng: longitude,
      image_url: imageUrl,
      severity: 'low',
    };

    try {
      const res = await fetchWithAuth('/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const item = json.data;
        if (item?.id) {
          navigate(`/citizen/incidents/${item.id}/receipt`);
        } else {
          navigate('/citizen');
        }
      } else {
        throw new Error(json.detail || json.message || 'Failed to submit report. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Server error. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = CATEGORIES.find((c) => c.value === category);

  // ── MAIN 5-STEP CONVERSATIONAL FLOW ──────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-16 pt-4 px-4 sm:px-6">
      {/* Step Progress Tracker */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--cr-citizen)]">
            Step {currentStep} of 5
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {currentStep === 1 && 'What happened?'}
            {currentStep === 2 && 'Tell us more'}
            {currentStep === 3 && 'Add evidence'}
            {currentStep === 4 && 'Confirm location'}
            {currentStep === 5 && 'Review & submit'}
          </span>
        </div>

        {/* 5-bar progress visual */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((stepNum) => {
            const isDone = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => {
                  if (stepNum < currentStep) goToStep(stepNum as ReportStep);
                }}
                disabled={stepNum > currentStep}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-[var(--cr-authority)] cursor-pointer'
                    : isCurrent
                    ? 'bg-[var(--cr-citizen)]'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
                aria-label={`Step ${stepNum}`}
              />
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--cr-red-light)] text-[var(--cr-red)] border border-red-200 dark:border-red-900/50 text-sm font-medium">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="hover:opacity-75 p-1"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Container */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900/90 overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8">
          {/* STEP 1: WHAT HAPPENED? (CATEGORY) */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  What kind of issue are you reporting?
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Select the category that best matches what you observed in your community.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        setError(null);
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 min-h-[76px] ${
                        isSelected
                          ? 'border-[var(--cr-authority)] bg-[var(--cr-authority-light)] shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/60'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[var(--cr-authority)] text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-sm font-bold ${
                              isSelected ? 'text-[var(--cr-authority)]' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {cat.label}
                          </h3>
                          {isSelected && <Check size={16} className="text-[var(--cr-authority)] shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cat.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  variant="citizen"
                  size="lg"
                  onClick={() => goToStep(2)}
                  className="font-semibold px-6"
                >
                  Next: Tell Us More <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: TELL US MORE (DESCRIPTION) */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold mb-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--cr-authority)]" />
                  Category: {selectedCategoryObj?.label}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Describe what happened
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Type or tap the microphone to speak in {currentLanguage.nativeName} ({currentLanguage.name}).
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="incident-description" className="text-xs font-bold uppercase text-slate-500">
                    Incident Details
                  </Label>

                  {/* Microphone speech button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      isRecording
                        ? 'bg-[var(--cr-red-light)] text-[var(--cr-red)] border-red-300 animate-pulse'
                        : 'bg-blue-50 text-[var(--cr-authority)] border-blue-200 hover:bg-blue-100 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff size={14} className="animate-bounce" />
                        <span>Recording... Tap to stop</span>
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        <span>Voice Input ({currentLanguage.code.toUpperCase()})</span>
                      </>
                    )}
                  </button>
                </div>

                <Textarea
                  id="incident-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Large pothole on the left lane near the petrol pump. It is around 1 foot deep and already caused two bikes to slip."
                  className="min-h-[140px] text-base p-3.5 focus-visible:ring-[var(--cr-authority)]"
                  maxLength={1000}
                />

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Be specific about landmarks or safety hazards</span>
                  <span>{description.length} / 1000 characters</span>
                </div>
              </div>

              {/* Quick snippet helpers */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">Quick suggestions (tap to add):</span>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SNIPPETS.map((snippet, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setDescription((prev) =>
                          prev ? `${prev}. ${snippet}` : snippet
                        )
                      }
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      + {snippet}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button variant="outline" onClick={() => goToStep(1)}>
                  <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>
                <Button
                  variant="citizen"
                  size="lg"
                  onClick={() => goToStep(3)}
                  disabled={!description.trim()}
                  className="font-semibold px-6"
                >
                  Next: Add Evidence <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ADD EVIDENCE (PHOTO) */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Add Photo Evidence
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Photos enable our AI vision model to automatically verify the hazard severity and dispatch workers 3x faster.
                </p>
              </div>

              {!imageUrl ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 sm:p-8 text-center hover:border-[var(--cr-authority)] bg-slate-50/50 dark:bg-slate-900/50 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Upload photo"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800 text-[var(--cr-authority)] flex items-center justify-center group-hover:scale-105 transition-transform">
                      {uploading ? (
                        <Loader2 className="animate-spin text-[var(--cr-authority)]" size={28} />
                      ) : (
                        <Camera size={28} />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                        {uploading ? 'Uploading and validating image…' : 'Take a photo or choose from gallery'}
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        JPEG, PNG or WebP up to 5 MB (Optional, but recommended)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[320px] bg-black">
                    <img
                      src={imageUrl}
                      alt="Uploaded incident proof"
                      className="w-full h-full object-contain max-h-[320px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl(null);
                        setAiImageStatus(null);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 hover:bg-red-600 text-white transition-colors backdrop-blur-sm"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {aiImageStatus === 'verified' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-[var(--cr-green)] border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold">
                      <ShieldCheck size={16} className="shrink-0" />
                      <span>AI Verification: Valid civic evidence detected. Ready for dispatch prioritization.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button variant="outline" onClick={() => goToStep(2)}>
                  <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>
                <div className="flex items-center gap-2">
                  {!imageUrl && (
                    <Button variant="ghost" onClick={() => goToStep(4)} className="text-slate-500">
                      Skip for now
                    </Button>
                  )}
                  <Button
                    variant="citizen"
                    size="lg"
                    onClick={() => goToStep(4)}
                    className="font-semibold px-6"
                  >
                    Next: Confirm Location <ArrowRight size={16} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: CONFIRM LOCATION (LOCATION) */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Where is this located?
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Click the map to pinpoint or let GPS detect your current spot.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDetectLocation}
                  disabled={gpsDetecting}
                  className="font-semibold text-xs border-blue-200 text-[var(--cr-authority)] hover:bg-blue-50 shrink-0"
                >
                  {gpsDetecting ? (
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                  ) : (
                    <Navigation size={14} className="mr-1.5" />
                  )}
                  {gpsDetecting ? 'Locating…' : 'Use Current GPS'}
                </Button>
              </div>

              {/* Map Preview */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative h-[220px] sm:h-[280px] shadow-inner">
                <MapContainer
                  center={latitude && longitude ? [latitude, longitude] : [28.6139, 77.209]}
                  zoom={latitude && longitude ? 15 : 12}
                  scrollWheelZoom={false}
                  className="w-full h-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickMarker
                    position={latitude && longitude ? [latitude, longitude] : null}
                    onSelect={handleSelectCoordinates}
                  />
                </MapContainer>
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 rounded-md z-[1000] pointer-events-none">
                  Tap anywhere on map to drop pin
                </div>
              </div>

              {/* Address input */}
              <div className="space-y-2">
                <Label htmlFor="incident-address" className="text-xs font-bold uppercase text-slate-500">
                  Street Address or Landmark
                </Label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="incident-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter street name, colony, landmark, or nearby shop…"
                    className="pl-10 h-11 text-sm focus-visible:ring-[var(--cr-authority)]"
                  />
                </div>
                {latitude !== null && longitude !== null && (
                  <span className="text-[11px] text-slate-400 font-mono block">
                    GPS Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button variant="outline" onClick={() => goToStep(3)}>
                  <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>
                <Button
                  variant="citizen"
                  size="lg"
                  onClick={() => goToStep(5)}
                  disabled={!address.trim()}
                  className="font-semibold px-6"
                >
                  Next: Review & Submit <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Review Your Civic Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Double check the details before submitting. Every section can be edited.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="text-xs font-semibold text-[var(--cr-authority)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {selectedCategoryObj && (
                      <div className="w-8 h-8 rounded-lg bg-[var(--cr-authority-light)] text-[var(--cr-authority)] flex items-center justify-center">
                        <selectedCategoryObj.icon size={16} />
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedCategoryObj?.label}
                    </span>
                  </div>
                </div>

                {/* Location Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Location
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(4)}
                      className="text-xs font-semibold text-[var(--cr-authority)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {address}
                  </p>
                </div>

                {/* Description Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="text-xs font-semibold text-[var(--cr-authority)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {description}
                  </p>
                </div>

                {/* Photo Evidence Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 sm:col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {imageUrl ? 'Photo Evidence Attached' : 'No Photo Provided'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {imageUrl
                          ? 'Valid civic evidence ready for automated priority score'
                          : 'You can still submit without an image'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="text-xs font-semibold text-[var(--cr-authority)] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Pre-routing Reassurance Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
                <Sparkles size={18} className="text-[var(--cr-authority)] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Automated Municipal Dispatch
                  </p>
                  <p>
                    Upon submission, your incident is assigned an immutable tracking ID, triaged via Jan Samadhan AI, and instantly queued with municipal field teams.
                  </p>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <Button variant="outline" onClick={() => goToStep(4)} disabled={isSubmitting}>
                  <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>
                <Button
                  variant="citizen"
                  size="xl"
                  onClick={handleSubmitReport}
                  disabled={isSubmitting}
                  className="flex-1 font-bold shadow-lg shadow-orange-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Registering Report…
                    </>
                  ) : (
                    <>
                      <Send size={18} className="mr-2" />
                      Submit Civic Report
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400 mt-6 font-medium">
        Jan Samadhan — Smart Civic Grievance & Public Works Redressal Portal
      </p>
    </div>
  );
}
