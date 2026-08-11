'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { ApiError } from '@/lib/api/http';
import { captureEnrollmentSample, completeEnrollment, getEnrollment, startEnrollment } from '@/lib/api/enrollment';
import { type CaptureType, type BiometricSample, getWorker } from '@/lib/api/workers';
import { analyzeFrame, captureVideoFrame, detectFacesFromCanvas, runDemoLivenessCheck } from '@/lib/biometric';

const CAPTURES: Array<{ type: CaptureType; label: string; prompt: string }> = [
  { type: 'CENTER', label: 'Center', prompt: 'Look directly at the camera.' },
  { type: 'LEFT', label: 'Left', prompt: 'Turn your head slightly left.' },
  { type: 'RIGHT', label: 'Right', prompt: 'Turn your head slightly right.' },
  { type: 'NEUTRAL', label: 'Neutral', prompt: 'Return to a neutral expression.' },
  { type: 'SMILE', label: 'Smile', prompt: 'Smile naturally.' },
  { type: 'LIVENESS', label: 'Liveness', prompt: 'Blink naturally for the demo liveness check.' },
];

function captureLabel(type: CaptureType) {
  return CAPTURES.find((capture) => capture.type === type)?.label ?? type;
}

export default function WorkerEnrollmentPage() {
  const router = useRouter();
  const params = useParams<{ worker_id: string }>();
  const workerId = Number(params.worker_id);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [workerName, setWorkerName] = useState('Worker');
  const [workerCode, setWorkerCode] = useState('');
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [samples, setSamples] = useState<BiometricSample[]>([]);
  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);
  const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Camera ready for enrollment.');
  const [qualityMessage, setQualityMessage] = useState('');
  const [faceInfo, setFaceInfo] = useState('Face detection API unavailable in this browser. Demo quality checks only.');
  const [isCapturing, setIsCapturing] = useState(false);
  const [livenessReady, setLivenessReady] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentToken = typeof window !== 'undefined' ? (localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '') : '';
  const currentCapture = CAPTURES[currentCaptureIndex] ?? CAPTURES[CAPTURES.length - 1];

  const capturedTypes = useMemo(() => new Set(samples.map((sample) => sample.capture_type)), [samples]);

  useEffect(() => {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function initialize() {
      try {
        setIsLoading(true);
        const [workerResponse, enrollmentResponse] = await Promise.all([
          getWorker(token, workerId),
          getEnrollment(token, workerId).catch(() => null),
        ]);
        setWorkerName(workerResponse.full_name);
        setWorkerCode(workerResponse.worker_code);
        const existingSamples = enrollmentResponse?.samples ?? workerResponse.enrollment?.samples ?? [];
        setSamples(existingSamples);
        setEnrollmentId(enrollmentResponse?.enrollment?.id ?? workerResponse.enrollment?.id ?? null);
        setCurrentCaptureIndex(Math.min(existingSamples.length, CAPTURES.length - 1));
      } catch (err) {
        setCameraError(err instanceof ApiError ? err.message : 'Unable to load enrollment record.');
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [workerId]);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('denied');
        setCameraError('Camera permission is required to enroll this worker.');
        return;
      }

      try {
        setPermissionState('requesting');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPermissionState('granted');
        setStatusMessage('Camera permission granted.');
        setCameraError('');
        if (!enrollmentId) {
          const start = await startEnrollment(currentToken, workerId, 'v1');
          setEnrollmentId(start.id);
          setStatusMessage('Biometric enrollment started.');
        }
      } catch (err) {
        setPermissionState('denied');
        setCameraError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Camera permission is required to enroll this worker.' : err instanceof Error ? err.message : 'Camera unavailable.');
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [currentToken, enrollmentId, workerId]);

  async function captureCurrentFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      throw new Error('Camera preview is not ready yet.');
    }

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to read camera frame.');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const quality = analyzeFrame(canvas);
    const detectedFaces = await detectFacesFromCanvas(canvas);

    if (detectedFaces && detectedFaces.length === 0) {
      setFaceInfo('Face not detected. Move closer and face the camera directly.');
    } else if (detectedFaces && detectedFaces.length > 1) {
      setFaceInfo('Multiple faces detected. Only one worker should be in frame.');
    } else if (detectedFaces && detectedFaces.length === 1) {
      setFaceInfo('Face detected.');
    } else {
      setFaceInfo('Face detection API unavailable in this browser. Demo quality checks only.');
    }

    setQualityMessage(quality.note ?? 'Demo quality check passed.');
    return { imageData: await captureVideoFrame(video), qualityStatus: quality.qualityStatus };
  }

  async function handleCapture() {
    if (!enrollmentId) {
      setCameraError('Enrollment has not been started.');
      return;
    }

    setIsCapturing(true);
    setCameraError('');
    try {
      if (currentCapture.type === 'LIVENESS') {
        setStatusMessage('DEMO LIVENESS: blink naturally, then capture when ready.');
        await runDemoLivenessCheck();
      }

      const frame = await captureCurrentFrame();
      const sample = await captureEnrollmentSample(currentToken, workerId, {
        capture_type: currentCapture.type,
        image_data: frame.imageData,
        quality_status: frame.qualityStatus,
      });
      setSamples((current) => [...current, sample]);
      const nextIndex = Math.min(currentCaptureIndex + 1, CAPTURES.length - 1);
      setCurrentCaptureIndex(nextIndex);
      setStatusMessage(`${captureLabel(currentCapture.type)} capture stored.`);

      if (currentCapture.type === 'LIVENESS' || nextIndex >= CAPTURES.length - 1) {
        setStatusMessage('All enrollment samples captured. Ready to complete.');
      }
    } catch (err) {
      setCameraError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to capture frame.');
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleFinish() {
    setIsFinishing(true);
    setCameraError('');
    try {
      await completeEnrollment(currentToken, workerId);
      router.replace(`/workers/${workerId}?enrollment=complete`);
    } catch (err) {
      setCameraError(err instanceof ApiError ? err.message : 'Unable to complete enrollment.');
    } finally {
      setIsFinishing(false);
    }
  }

  const activeCapture = CAPTURES[Math.min(currentCaptureIndex, CAPTURES.length - 1)];

  return (
    <AppShell title="Biometric enrollment" subtitle="Camera-first enrollment station with honest demo liveness and capture tracking." allowedRoles={['ADMIN', 'SUPERVISOR']}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={`/workers/${workerId}`} className="inline-flex items-center gap-2 text-sm text-[#dfeab1] transition hover:text-[#f5f1e8]"><ArrowLeft size={14} /> Back to worker</Link>
        <div className="flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-3 py-2 text-xs uppercase tracking-[0.25em] text-[#8d998b]"><Sparkles size={14} className="text-[#b7cc75]" /> Demo liveness</div>
      </div>

      {cameraError ? <div className="mb-4 rounded border border-[#6d3e2b]/40 bg-[#24150f] px-4 py-3 text-sm text-[#f1ba98]">{cameraError}</div> : null}
      {statusMessage ? <div className="mb-4 rounded border border-[#3e5f2d]/40 bg-[#111a0f] px-4 py-3 text-sm text-[#dfeab1]">{statusMessage}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-5">
          <div className="flex items-center justify-between gap-4 border-b border-[rgba(183,196,170,0.12)] pb-4">
            <div>
              <p className="terra-kicker">Biometric enrollment</p>
              <h2 className="mt-1 text-2xl font-light text-[#f5f1e8]">{workerName}</h2>
              <p className="mt-1 text-sm text-[#8d998b]">{workerCode}</p>
            </div>
            <div className={`rounded border px-3 py-2 text-xs uppercase tracking-[0.25em] ${permissionState === 'granted' ? 'border-[#b7cc75]/35 bg-[#141d14] text-[#dfeab1]' : 'border-[rgba(183,196,170,0.12)] bg-[#101610] text-[#8d998b]'}`}>
              {permissionState === 'granted' ? 'Camera active' : permissionState === 'requesting' ? 'Requesting camera' : 'Camera idle'}
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-[#8d998b]">
                <span>Live camera</span>
                <span>{permissionState === 'granted' ? 'Permission granted' : 'Permission required'}</span>
              </div>
              <div className="overflow-hidden rounded border border-[rgba(183,196,170,0.12)] bg-[#050805]">
                <video ref={videoRef} playsInline muted className="h-[360px] w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="mt-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#a8b1a1]">
                <div className="flex items-center gap-2 text-[#dfeab1]"><ShieldCheck size={15} className="text-[#b7cc75]" /> Face quality</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div>Lighting {qualityMessage ? '✓' : '—'}</div>
                  <div>{faceInfo}</div>
                  <div>Frame available {permissionState === 'granted' ? '✓' : '—'}</div>
                  <div>Single face {faceInfo.includes('Multiple') ? '—' : '✓'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#8d998b]">Step {currentCaptureIndex + 1} of {CAPTURES.length}</div>
                <div className="mt-2 text-lg font-light text-[#f5f1e8]">{activeCapture.label}</div>
                <p className="mt-2 text-sm text-[#a8b1a1]">{activeCapture.prompt}</p>
                {activeCapture.type === 'LIVENESS' ? <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#dfeab1]">DEMO LIVENESS</p> : null}
              </div>

              <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8d998b]">Captured samples</span>
                  <span className="text-[#dfeab1]">{samples.length}/{CAPTURES.length}</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-[#a8b1a1]">
                  {CAPTURES.map((capture) => (
                    <div key={capture.type} className="flex items-center justify-between rounded border border-[rgba(183,196,170,0.08)] bg-[#0f140f] px-3 py-2">
                      <span>{capture.label}</span>
                      <span>{capturedTypes.has(capture.type) ? 'Captured' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                <div className="flex items-center gap-2 text-[#dfeab1]"><AlertTriangle size={15} className="text-[#b7cc75]" /> Camera guidance</div>
                <p className="mt-3 text-sm leading-relaxed text-[#a8b1a1]">Keep one face in frame, stay centered, and follow the prompt for each sample. The liveness check is a demo interaction and is labeled honestly.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(183,196,170,0.12)] pt-4">
            <button type="button" onClick={handleCapture} disabled={isCapturing || permissionState !== 'granted'} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60"><Camera size={14} /> {isCapturing ? 'Capturing…' : 'Capture'}</button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push(`/workers/${workerId}`)} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#141a14]">Cancel</button>
              <button type="button" onClick={handleFinish} disabled={isFinishing || samples.length < CAPTURES.length} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60"><CheckCircle2 size={14} /> {isFinishing ? 'Finishing…' : 'Finish'}</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <div className="flex items-center gap-2 text-[#dfeab1]"><RefreshCcw size={16} className="text-[#b7cc75]" /> Enrollment progress</div>
            <div className="mt-4 space-y-2 text-sm text-[#a8b1a1]">
              <p>Center: {capturedTypes.has('CENTER') ? 'Captured' : 'Pending'}</p>
              <p>Left: {capturedTypes.has('LEFT') ? 'Captured' : 'Pending'}</p>
              <p>Right: {capturedTypes.has('RIGHT') ? 'Captured' : 'Pending'}</p>
              <p>Neutral: {capturedTypes.has('NEUTRAL') ? 'Captured' : 'Pending'}</p>
              <p>Smile: {capturedTypes.has('SMILE') ? 'Captured' : 'Pending'}</p>
              <p>Liveness: {capturedTypes.has('LIVENESS') ? 'Captured' : 'Pending'}</p>
            </div>
          </div>

          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <div className="flex items-center gap-2 text-[#dfeab1]"><Sparkles size={16} className="text-[#b7cc75]" /> Demo liveness</div>
            <p className="mt-4 text-sm leading-relaxed text-[#a8b1a1]">Blink naturally when prompted. This hackathon build uses a demo-side liveness interaction and does not claim production anti-spoofing.</p>
          </div>

          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <div className="flex items-center gap-2 text-[#dfeab1]"><ShieldCheck size={16} className="text-[#b7cc75]" /> Current record</div>
            <div className="mt-4 text-sm text-[#a8b1a1]">
              <p>Worker: {workerName}</p>
              <p>Worker ID: {workerCode}</p>
              <p>Samples captured: {samples.length}</p>
              <p>Enrollment ID: {enrollmentId ?? 'Pending'}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
