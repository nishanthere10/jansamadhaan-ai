import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { supabase } from '../../lib/supabase/client';
import { Camera, MapPin, Loader2, CheckCircle2, AlertCircle, X, Mic, Sparkles, Send } from 'lucide-react';

import { useTranslation } from '../../lib/useTranslation';

import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const CATEGORIES = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water-leakage', label: 'Water Leakage' },
  { value: 'fallen-tree', label: 'Fallen Tree' },
  { value: 'broken-streetlight', label: 'Broken Streetlight' },
  { value: 'other', label: 'Other' },
] as const;

export default function ReportIncident() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  
  // Stages: 'draft' -> 'analyzing' -> 'review' -> 'submitting'
  const [stage, setStage] = useState<'draft' | 'analyzing' | 'review' | 'submitting'>('draft');

  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // AI Suggestions
  const [aiTitle, setAiTitle] = useState('');
  const [aiCategory, setAiCategory] = useState('other');
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    // Basic Web Speech API check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please type.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
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
            setDescription((prev) => prev ? prev + ' ' + transcript : transcript);
          }
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) return setError('Only images allowed.');
    if (file.size > 5 * 1024 * 1024) return setError('Image must be < 5 MB.');

    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `incidents/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('grievance_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('grievance_images')
        .getPublicUrl(filePath);

      setImageUrl(urlData.publicUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image upload failed.';
      setError(message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!description || !address) {
      setError("Please describe the issue and provide a location.");
      return;
    }
    setError(null);
    setStage('analyzing');

    try {
      const res = await fetchWithAuth('/api/v1/ai/classify', {
        method: 'POST',
        body: JSON.stringify({ text: description }),
      });
      
      let json: Record<string, unknown> = {};
      const text = await res.text();
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          console.warn("Could not parse JSON response:", text);
        }
      }
      
      if (res.ok) {
        if (json.is_spam === true) {
          // Proceed to review silently
        }

        setAiTitle(String(json.generated_title || 'Citizen Report'));
        setAiCategory(String(json.category || 'other'));
        setAiKeywords(Array.isArray(json.keywords) ? json.keywords : []);
        setStage('review');
      } else {
        throw new Error(json.detail || "Classification failed");
      }
    } catch (err) {
      console.warn("AI Classification failed, falling back to manual", err);
      // Fallback
      setAiTitle('Citizen Report');
      setAiCategory('other');
      setStage('review');
    }
  };

  const handleSubmit = async () => {
    setStage('submitting');
    setError(null);

    const payload = {
      title: aiTitle,
      category: aiCategory.toLowerCase(),
      description,
      address,
      location_lat: latitude,
      location_lng: longitude,
      image_url: imageUrl,
      severity: 'low', // Validated via LangGraph later
    };

    try {
      const res = await fetchWithAuth('/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      let json: Record<string, unknown> = {};
      const text = await res.text();
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          console.warn("Could not parse JSON response:", text);
        }
      }

      if (res.ok && json.success) {
        navigate('/dashboard');
      } else {
        throw new Error(json.detail || json.message || `Server Error (${res.status}): Failed to submit report.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed.';
      setError(message);
      setStage('review');
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 pt-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Badge variant="outline" className="mb-3 uppercase tracking-wider text-[10px] font-bold text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 hover:bg-indigo-50">
          {t('report.badge')}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
          {t('report.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
          {t('report.subtitle')}
        </p>
      </motion.div>

      <Card className="border-slate-200/60 dark:border-slate-800 shadow-xl shadow-blue-900/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-red-900/50 font-medium text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {stage === 'draft' || stage === 'analyzing' ? (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              {/* Description / Audio Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t('report.description')}</Label>
                  <button 
                    type="button" 
                    onClick={startRecording}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${isRecording ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-900/50 animate-pulse' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 dark:hover:bg-blue-900/40'}`}
                  >
                    <Mic size={14} className={isRecording ? "animate-bounce" : ""} />
                    {isRecording ? t('report.listening') : t('report.tapSpeak')}
                    <span className="text-[9px] opacity-70 ml-0.5">{currentLanguage.nativeName}</span>
                  </button>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Huge pothole on MG Road near the school. Very dangerous for two-wheelers."
                  className="min-h-[140px] text-[15px] resize-y bg-white/50 dark:bg-slate-950/50 focus-visible:ring-indigo-500"
                  disabled={stage === 'analyzing'}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t('report.location')}</Label>
                  <button 
                    type="button"
                    onClick={() => {
                       if (!navigator.geolocation) {
                          setError("Geolocation is not supported by your browser");
                          return;
                       }
                       navigator.geolocation.getCurrentPosition(
                          async (position) => {
                             const lat = position.coords.latitude;
                             const lng = position.coords.longitude;
                             setLatitude(lat);
                             setLongitude(lng);
                             setAddress(`Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`);
                             
                             try {
                               const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                               const data = await res.json();
                               if (data && data.display_name) {
                                 setAddress(data.display_name);
                               }
                             } catch (e) {
                               console.warn("Reverse geocode failed", e);
                             }
                          },
                          () => setError("Unable to retrieve your location")
                       );
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 transition-colors flex items-center gap-1"
                  >
                    <MapPin size={12} /> {t('report.autoDetect')}
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street name, landmark, or pinpoint..."
                    className="pl-10 h-12 text-[15px] bg-white/50 dark:bg-slate-950/50 focus-visible:ring-indigo-500"
                    disabled={stage === 'analyzing'}
                  />
                </div>
              </div>

              {/* Photo evidence */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  {t('report.attachEvidence')} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{t('report.optional')}</span>
                </Label>
                
                {!imageUrl ? (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-xl h-[120px] flex items-center justify-center relative hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading || stage === 'analyzing'}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {uploading ? <Loader2 className="animate-spin text-blue-500" size={28} /> : <Camera size={28} />}
                      <span className="text-sm font-bold tracking-wide">{uploading ? t('report.uploading') : t('report.uploadPhoto')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden h-[200px] border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                    <img src={imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
                    <button onClick={() => setImageUrl(null)} className="absolute top-3 right-3 bg-slate-900/60 backdrop-blur-md text-white p-2 rounded-full hover:bg-red-500 transition-colors shadow-sm">
                      <X size={16} strokeWidth={3} />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-slate-900/60 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2 py-1.5 rounded shadow-sm flex items-center gap-1.5 opacity-90">
                       <CheckCircle2 size={12} className="text-emerald-400"/> Image Attached Securely
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={handleAnalyze}
                  disabled={stage === 'analyzing' || !description || !address}
                  className="w-full h-12 text-[15px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all"
                >
                  {stage === 'analyzing' ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> {t('report.analyzing')}</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles size={18} /> {t('report.reviewContinue')}</span>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-6 shadow-sm">
                <h3 className="text-xs uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400 mb-6 flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/50"><Sparkles size={14} /></div> 
                  {t('report.aiVerification')}
                </h3>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">{t('report.standardizedTitle')}</Label>
                    <Input
                      type="text"
                      value={aiTitle}
                      onChange={(e) => setAiTitle(e.target.value)}
                      className="h-11 font-semibold text-slate-900 dark:text-slate-100 bg-white shadow-sm dark:bg-slate-900 focus-visible:ring-indigo-500 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">{t('report.routingCategory')}</Label>
                    <select
                      value={aiCategory.toLowerCase()}
                      onChange={(e) => setAiCategory(e.target.value)}
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950 dark:focus:ring-indigo-500 font-medium shadow-sm"
                    >
                       <option value={aiCategory.toLowerCase()}>{aiCategory.toUpperCase()}</option>
                       {CATEGORIES.filter(c => c.value.toLowerCase() !== aiCategory.toLowerCase()).map(c => (
                         <option key={c.value} value={c.value.toLowerCase()}>{c.label}</option>
                       ))}
                    </select>
                  </div>

                  {aiKeywords.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">{t('report.extractedEntities')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {aiKeywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 pointer-events-none hover:bg-slate-100 font-medium">
                            #{kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStage('draft')}
                  disabled={stage === 'submitting'}
                  className="flex-1 h-12 font-bold"
                >
                  {t('report.editInput')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={stage === 'submitting'}
                  className="flex-[2] h-12 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                >
                  {stage === 'submitting' ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> {t('report.submitting')}</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send size={18} /> {t('report.confirmDispatch')}</span>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 tracking-wider font-semibold">
        {t('report.govFooter')}
      </p>
    </div>
  );
}
