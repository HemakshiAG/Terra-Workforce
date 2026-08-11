"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Camera, MapPin, ShieldCheck, TriangleAlert, QrCode } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { verifyAttendance, checkIn } from '@/lib/api/attendance';

type Step = 'idle' | 'requesting-camera' | 'camera-active' | 'face-detected' | 'liveness-checking' | 'face-matching' | 'gps-checking' | 'verified' | 'attendance-marked' | 'error';

function TerminalClient() {
  const searchParams = useSearchParams();
  const sessionId = parseInt(searchParams.get('session') || '0', 10);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);

  const startFlow = async () => {
    if (!sessionId) {
      setError('No session ID provided. Start this from the supervisor dashboard.');
      setStep('error');
      return;
    }

    setStep('requesting-camera');
    setError(null);
    setResult(null);
    setAttendance(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera unavailable in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamReady(true);
      setStep('camera-active');

      await new Promise(r => setTimeout(r, 700));
      setStep('face-detected');
      await new Promise(r => setTimeout(r, 700));
      setStep('liveness-checking');
      await new Promise(r => setTimeout(r, 700));
      
      // Simulate face capture & GPS
      setStep('gps-checking');
      if (!navigator.geolocation) {
        throw new Error('GPS unavailable in this browser.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      setStep('face-matching');

      // The real terminal would detect which worker face belongs to.
      // For demo, we assume the first worker (ID 1)
      const workerId = 1;
      
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) throw new Error("No auth token");

      // 1. Verify Attempt
      const attempt = await verifyAttendance(token, {
        session_id: sessionId,
        worker_id: workerId,
        verification_method: 'FACE',
        face_image_data: 'demo-face-data', // triggers DemoRecognitionService.MATCHED
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      if (attempt.result !== 'SUCCESS') {
        throw new Error(`Verification failed: ${attempt.failure_reason}`);
      }
      setResult(attempt);
      setStep('verified');
      await new Promise(r => setTimeout(r, 500));

      // 2. Check-in
      const checkInRecord = await checkIn(token, attempt.id);
      setAttendance(checkInRecord);
      setStep('attendance-marked');

    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setStep('error');
    }
  };

  useEffect(() => {
    return () => {
      const tracks = videoRef.current?.srcObject as MediaStream | null;
      tracks?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const statusText = useMemo(() => {
    switch (step) {
      case 'idle': return 'Start verification';
      case 'requesting-camera': return 'Requesting camera permission';
      case 'camera-active': return 'Look at the camera';
      case 'face-detected': return 'Face detected. Blink to verify liveness.';
      case 'liveness-checking': return 'Checking liveness...';
      case 'gps-checking': return 'Acquiring GPS...';
      case 'face-matching': return 'Demo recognition in progress...';
      case 'verified': return 'Verified ✓';
      case 'attendance-marked': return 'Attendance marked';
      case 'error': return 'Verification failed';
      default: return 'Ready';
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-[#030604] p-4 text-mist flex flex-col items-center pt-10">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-2xl tracking-wide uppercase text-lime">Attendance Terminal</h1>
        <p className="text-mist/50 tracking-widest text-xs mt-2">SESSION ID: {sessionId || 'NONE'}</p>
      </div>

      <div className="w-full max-w-2xl rounded border border-[#243124] bg-[#050b07] p-6 text-center shadow-2xl shadow-lime/5">
        <h2 className="text-xl mb-6 text-mist/90">{statusText}</h2>
        
        <div className="relative mx-auto flex h-80 w-full max-w-[420px] items-center justify-center overflow-hidden rounded border border-lime/20 bg-[#081209]">
          {streamReady ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-mist/40">
              <Camera size={56} className="text-lime/30" />
              <p>Camera inactive.</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button 
            onClick={startFlow} 
            disabled={step !== 'idle' && step !== 'error' && step !== 'attendance-marked'}
            className="rounded border border-lime/30 bg-lime/10 px-6 py-3 text-sm text-lime disabled:opacity-50"
          >
            {step === 'attendance-marked' || step === 'error' ? 'Verify Next Worker' : 'Start Camera'}
          </button>
          
          <button className="rounded border border-[#243124] px-6 py-3 text-sm text-mist/70 flex items-center gap-2 hover:bg-[#0a140b]">
            <QrCode size={16} /> Use QR Backup
          </button>
        </div>

        {result && step === 'attendance-marked' && (
          <div className="mt-8 text-left rounded border border-[#243124] bg-[#081209] p-5">
            <div className="flex items-center gap-3 text-lime mb-2">
              <ShieldCheck size={20} />
              <span className="text-lg">ATTENDANCE VERIFIED</span>
            </div>
            <p className="text-sm text-mist/70 mb-1">Worker ID: {result.worker_id}</p>
            <p className="text-sm text-mist/70 mb-1">Face: {result.face_match_status === 'MATCHED' ? '✓ Matched (Demo)' : result.face_match_status}</p>
            <p className="text-sm text-mist/70 mb-1">Liveness: {result.liveness_status === 'PASSED' ? '✓ Passed' : result.liveness_status}</p>
            <p className="text-sm text-mist/70 mb-1">Location: {result.location_status === 'WITHIN_GEOFENCE' ? `✓ On site (${Math.round(result.distance_from_worksite || 0)}m)` : result.location_status}</p>
            <p className="text-sm text-mist mt-3 font-mono">Recorded at {new Date(attendance?.check_in_at).toLocaleTimeString()}</p>
          </div>
        )}

        {error && (
          <div className="mt-8 text-left rounded border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <TriangleAlert size={20} />
              <span className="text-lg">VERIFICATION FAILED</span>
            </div>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttendanceTerminalPage() {
  return (
    <Suspense fallback={<div>Loading terminal...</div>}>
      <TerminalClient />
    </Suspense>
  );
}
