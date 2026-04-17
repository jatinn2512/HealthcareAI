import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/Button";

interface CameraCaptureModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  captureLabel?: string;
  processing?: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => Promise<void> | void;
}

const CameraCaptureModal = ({
  open,
  title,
  subtitle,
  captureLabel = "Capture",
  processing = false,
  onClose,
  onCapture,
}: CameraCaptureModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const startCamera = async () => {
      setIsStartingCamera(true);
      setCameraError("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : "Unable to access camera.");
      } finally {
        setIsStartingCamera(false);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to process captured image.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    await onCapture(imageDataUrl);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCameraError("Please choose an image file.");
      return;
    }

    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Unable to read selected image."));
        }
      };
      reader.onerror = () => reject(new Error("Unable to read selected image."));
      reader.readAsDataURL(file);
    }).catch((error) => {
      setCameraError(error instanceof Error ? error.message : "Unable to read selected image.");
      return "";
    });

    if (!imageDataUrl) return;
    setCameraError("");
    await onCapture(imageDataUrl);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-3xl border border-border/70 bg-card p-4 shadow-[0_32px_90px_-30px_hsl(222_40%_6%/0.9)] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-black/90">
          <video ref={videoRef} autoPlay muted playsInline className="h-[48vh] w-full object-cover sm:h-[54vh]" />
        </div>

        {cameraError ? <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{cameraError}</div> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleFileChange(event);
            }}
          />
          <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={handleUploadClick} disabled={isStartingCamera || processing}>
            <Upload className="h-4 w-4" />
            Upload Photo
          </Button>
          <Button type="button" className="h-10 rounded-xl bg-primary px-4 text-primary-foreground" onClick={handleCapture} disabled={isStartingCamera || processing}>
            {isStartingCamera || processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {processing ? "Processing..." : captureLabel}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CameraCaptureModal;
