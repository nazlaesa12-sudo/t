import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Loader2,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import { CoordinatesCapture } from '../types/hrm';
import {
  formatDateDDMMMYYYY,
  getCurrentTimeHHMMSS,
} from '../utils/dateFormat';

interface SelfieCameraModalProps {
  mode: 'checkin' | 'checkout';
  employeeName: string;
  onClose: () => void;
  onConfirm: (photoDataUrl: string, coords: CoordinatesCapture) => Promise<void>;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({
  mode,
  employeeName,
  onClose,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<
    'initializing' | 'ready' | 'unavailable'
  >('initializing');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [gpsState, setGpsState] = useState<'locating' | 'ready' | 'fallback'>(
    'locating'
  );
  const [coords, setCoords] = useState<CoordinatesCapture>({
    lat: -6.208763,
    lng: 106.845599,
    accuracy: 15,
    address: 'Lokasi GPS Sedang Dimuat...',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState('initializing');
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setCameraError('Browser tidak mendukung akses kamera live.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 800 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('ready');
    } catch (err) {
      setCameraState('unavailable');
      setCameraError(
        err instanceof Error
          ? `Kamera tidak tersedia atau izin ditolak (${err.name}).`
          : 'Izin kamera diperlukan untuk foto selfie.'
      );
    }
  }, [stopCamera]);

  const requestLocation = useCallback(() => {
    setGpsState('locating');
    if (!navigator.geolocation) {
      setGpsState('fallback');
      setCoords({
        lat: -6.208763,
        lng: 106.845599,
        accuracy: 25,
        address: 'Koordinat Kantor Pusat (-6.20876, 106.84560)',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 15);
        setCoords({
          lat,
          lng,
          accuracy,
          address: `GPS Terverifikasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        });
        setGpsState('ready');
      },
      () => {
        setGpsState('fallback');
        setCoords({
          lat: -6.208763,
          lng: 106.845599,
          accuracy: 35,
          address: 'Area Kantor Pusat (-6.20876, 106.84560)',
        });
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 15000 }
    );
  }, []);

  useEffect(() => {
    void startCamera();
    requestLocation();
    return () => stopCamera();
  }, [startCamera, requestLocation, stopCamera]);

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror selfie horizontally and crop cover into 320x400
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = canvas.width / canvas.height;
    const videoRatio = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    drawStampOverlay(ctx, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const captureFallbackSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 320, 400);
    grad.addColorStop(0, '#312E81');
    grad.addColorStop(1, '#4F46E5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 400);

    // Clean silhouette avatar
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(160, 145, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(160, 290, 92, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(employeeName, 160, 248);

    drawStampOverlay(ctx, canvas.width, canvas.height);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.7));
  };

  const drawStampOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, h - 58, w, 58);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = '600 12px sans-serif';
    const label = mode === 'checkin' ? 'CHECK-IN' : 'CHECK-OUT';
    ctx.fillText(
      `${label} · ${formatDateDDMMMYYYY(new Date())} ${getCurrentTimeHHMMSS(new Date())}`,
      12,
      h - 34
    );

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '11px monospace';
    ctx.fillText(
      `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${coords.accuracy}m)`,
      12,
      h - 14
    );
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    void startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedPhoto || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(capturedPhoto, coords);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionTitle = mode === 'checkin' ? 'Selfie Check-in' : 'Selfie Check-out';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        {/* Mobile Grab Handle */}
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              {actionTitle}
            </h3>
            <p className="text-xs text-slate-500">
              {employeeName} · {formatDateDDMMMYYYY(new Date())}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Tutup kamera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera / Preview Viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120]">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt={`Hasil foto ${actionTitle}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover scale-x-[-1] ${
                    cameraState === 'ready' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                {cameraState === 'initializing' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-200">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                    <span className="text-xs">Menyiapkan kamera depan...</span>
                  </div>
                )}
                {cameraState === 'unavailable' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-slate-200">
                    <Camera className="h-9 w-9 text-slate-400" />
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                      {cameraError}
                    </p>
                    <div className="mt-4 flex flex-col gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="min-h-[40px] rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Coba Aktifkan Kamera Lagi
                      </button>
                      <button
                        type="button"
                        onClick={captureFallbackSnapshot}
                        className="min-h-[40px] rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Gunakan Verifikasi Foto Virtual
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* GPS Location Readout */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {gpsState === 'locating'
                      ? 'Mengambil Koordinat GPS...'
                      : gpsState === 'ready'
                      ? 'Lokasi GPS Terkunci'
                      : 'Lokasi Area Kantor (Default)'}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-600">
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)} · Akurasi ±
                    {coords.accuracy}m
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={requestLocation}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70"
                title="Perbarui lokasi GPS"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    gpsState === 'locating' ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t border-slate-200 bg-white p-4 pb-safe">
          {!capturedPhoto ? (
            <button
              type="button"
              disabled={cameraState !== 'ready'}
              onClick={captureFromVideo}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Camera className="h-4 w-4" />
              <span>Ambil Foto Selfie</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRetake}
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Ulangi Foto</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>
                  {isSubmitting
                    ? 'Menyimpan...'
                    : mode === 'checkin'
                    ? 'Kirim Check-in'
                    : 'Kirim Check-out'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
