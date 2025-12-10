import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { ScannerStatus } from '../types';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface ScannerProps {
  onScan: (content: string, format: string) => void;
  isPaused: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, isPaused }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<ScannerStatus>(ScannerStatus.IDLE);
  const animationFrameRef = useRef<number>();

  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const scanFrame = useCallback(() => {
    // Check if component is still mounted/ref exists
    if (!videoRef.current || !canvasRef.current) return;

    if (isPaused) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // Set canvas to match video dimensions
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;

        // Calculate ROI (Region of Interest) - Center Square
        // We want to scan a square area in the center, essentially matching the visual guide
        const size = Math.min(canvas.width, canvas.height) * 0.7; // Scan 70% of the smaller dimension
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;

        // Draw full frame for debugging/visuals (optional, usually we just need data)
        // ctx.drawImage(video, 0, 0, canvas.width, canvas.height); 

        // Extract ROI data directly
        // Note: Creating a temporary canvas for cropping can be cleaner but getImageData is direct
        // However, we can't simple getImageData from the video. We must draw to canvas first.
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(x, y, size, size);

        // Use jsQR to decode ONLY the ROI
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code && code.data) {
          // Draw outline - needed to translate ROI coordinates back to full canvas
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#10b981"; // Emerald 500

          const tl = code.location.topLeftCorner;
          const tr = code.location.topRightCorner;
          const br = code.location.bottomRightCorner;
          const bl = code.location.bottomLeftCorner;

          // Translate coordinates: add offsetX (x) and offsetY (y)
          ctx.moveTo(tl.x + x, tl.y + y);
          ctx.lineTo(tr.x + x, tr.y + y);
          ctx.lineTo(br.x + x, br.y + y);
          ctx.lineTo(bl.x + x, bl.y + y);
          ctx.lineTo(tl.x + x, tl.y + y);
          ctx.stroke();

          // Notify parent using ref
          onScanRef.current(code.data, "QR_CODE");
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [isPaused]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      setStatus(ScannerStatus.SCANNING);
      try {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            advanced: [{ focusMode: 'continuous' }] as any
          }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Crucial for iOS/Android inline playback
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setStatus(ScannerStatus.PERMISSION_DENIED);
      }
    };

    startCamera();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanFrame]);

  return (
    <div className="relative w-full aspect-[4/3] bg-black overflow-hidden rounded-xl shadow-lg border border-slate-700 group">
      {status === ScannerStatus.PERMISSION_DENIED && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-4 text-center">
          <CameraOff size={48} className="mb-2" />
          <p>Camera permission denied.</p>
          <p className="text-sm text-slate-400 mt-1">Please allow camera access to scan.</p>
        </div>
      )}

      {status === ScannerStatus.SCANNING && (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover hidden" />

          {/* Viewfinder Overlay */}
          <div className="absolute inset-0 border-2 border-slate-900/50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 border-2 border-emerald-500/50 rounded-lg box-border shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] pointer-events-none transition-colors duration-300">
              {/* Scanning Animation Line */}
              {!isPaused && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[scan_2s_linear_infinite]" />
              )}
            </div>
          </div>

          {isPaused && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                Scanning Paused
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Scanner;
