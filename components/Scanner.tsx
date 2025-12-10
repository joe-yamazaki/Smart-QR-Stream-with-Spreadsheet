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

  const scanFrame = useCallback(() => {
    if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to decode
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
           // Draw outline
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#10b981"; // Emerald 500
            ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
            ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
            ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
            ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
            ctx.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
            ctx.stroke();

            // Notify parent
            onScan(code.data, "QR_CODE");
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [onScan, isPaused]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      setStatus(ScannerStatus.SCANNING);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
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
