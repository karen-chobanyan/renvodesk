import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n";
import { MAX_FILE_BYTES } from "./file-model";

const copy = {
  fr: {
    photo: "Prendre une photo",
    voice: "Note vocale",
    start: "Démarrer l’enregistrement",
    stop: "Arrêter",
    take: "Prendre la photo",
    use: "Utiliser ce fichier",
    cancel: "Annuler",
    retry: "Recommencer",
    waiting: "Autorisez l’accès à l’appareil…",
    error:
      "Appareil indisponible ou accès refusé. Vérifiez les autorisations du navigateur puis réessayez. Une connexion HTTPS est nécessaire hors localhost.",
    hint: "Vérifiez votre capture avant de l’ajouter. L’import sera lancé depuis la page du projet.",
    limit: "Note vocale : 5 minutes maximum, 10 Mio maximum.",
    recording: "Enregistrement en cours",
    large:
      "Capture vide ou trop volumineuse. Recommencez avec une capture plus courte.",
  },
  en: {
    photo: "Take a photo",
    voice: "Voice note",
    start: "Start recording",
    stop: "Stop",
    take: "Take photo",
    use: "Use this file",
    cancel: "Cancel",
    retry: "Retake",
    waiting: "Allow access to your device…",
    error:
      "Device unavailable or permission denied. Check browser permissions and try again. HTTPS is required outside localhost.",
    hint: "Review your capture before adding it. Upload it from the project page afterwards.",
    limit: "Voice note: up to 5 minutes and 10 MiB.",
    recording: "Recording",
    large: "Capture is empty or too large. Try a shorter capture.",
  },
};
export function MediaCapture({
  kind,
  close,
  select,
}: {
  kind: "photo" | "voice";
  close: () => void;
  select: (file: File) => void;
}) {
  const { locale } = useLocale(),
    c = copy[locale];
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const alive = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly reacquires the device
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    let acquired: MediaStream | undefined;
    setError("");
    setStream(null);
    void (async () => {
      try {
        if (
          !navigator.mediaDevices?.getUserMedia ||
          (kind === "voice" && typeof MediaRecorder === "undefined")
        )
          throw new Error();
        acquired = await navigator.mediaDevices.getUserMedia(
          kind === "photo"
            ? { video: { facingMode: { ideal: "environment" } }, audio: false }
            : { audio: true, video: false },
        );
        if (cancelled)
          acquired.getTracks().forEach((track) => {
            track.stop();
          });
        else setStream(acquired);
      } catch {
        if (!cancelled) setError(c.error);
      }
    })();
    return () => {
      cancelled = true;
      alive.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      acquired?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, [kind, attempt, c.error]);
  useEffect(() => {
    if (video.current && stream && !file) video.current.srcObject = stream;
  }, [stream, file]);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const object = URL.createObjectURL(file);
    setUrl(object);
    return () => URL.revokeObjectURL(object);
  }, [file]);
  useEffect(() => {
    if (!recording) return;
    const started = performance.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= 300 && recorder.current?.state === "recording")
        recorder.current.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) close();
    };
    document.addEventListener("visibilitychange", stop);
    return () => document.removeEventListener("visibilitychange", stop);
  }, [close]);
  function finish(blob: Blob, ext: string) {
    stream?.getTracks().forEach((track) => {
      track.stop();
    });
    if (!alive.current) return;
    if (!blob.size || blob.size > MAX_FILE_BYTES) {
      setError(c.large);
      return;
    }
    setFile(
      new File([blob], `${kind}-${crypto.randomUUID().slice(0, 8)}.${ext}`, {
        type: blob.type,
      }),
    );
  }
  function takePhoto() {
    const camera = video.current;
    if (!camera?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      2000 / Math.max(camera.videoWidth, camera.videoHeight),
    );
    canvas.width = Math.round(camera.videoWidth * scale);
    canvas.height = Math.round(camera.videoHeight * scale);
    canvas
      .getContext("2d")
      ?.drawImage(camera, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) finish(blob, "jpg");
        else setError(c.error);
      },
      "image/jpeg",
      0.85,
    );
  }
  function startRecording() {
    if (!stream) return;
    try {
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mime) throw new Error();
      const active = new MediaRecorder(stream, {
        mimeType: mime,
        audioBitsPerSecond: 64000,
      });
      recorder.current = active;
      const chunks: Blob[] = [];
      let size = 0,
        broken = false;
      active.ondataavailable = (event) => {
        chunks.push(event.data);
        size += event.data.size;
        if (size >= MAX_FILE_BYTES && active.state === "recording")
          active.stop();
      };
      active.onerror = () => {
        broken = true;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        if (alive.current) {
          setRecording(false);
          setError(c.error);
        }
      };
      active.onstop = () => {
        if (alive.current) setRecording(false);
        if (!broken)
          finish(
            new Blob(chunks, { type: mime }),
            mime === "audio/mp4" ? "m4a" : mime.split("/")[1],
          );
      };
      active.start(1000);
      setSeconds(0);
      setRecording(true);
    } catch {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setError(c.error);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent title={c[kind]} description={c.hint} closeLabel={c.cancel}>
        {error ? (
          <p role="alert">{error}</p>
        ) : file ? (
          kind === "photo" ? (
            <img className="capture-preview" src={url} alt={c.photo} />
          ) : (
            // biome-ignore lint/a11y/useMediaCaption: user-created voice recording has no transcript
            <audio controls src={url} aria-label={c.voice} />
          )
        ) : !stream ? (
          <p role="status">{c.waiting}</p>
        ) : kind === "photo" ? (
          <video
            className="capture-preview"
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label={c.photo}
          />
        ) : (
          <p role="status">
            {recording
              ? `${c.recording} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
              : c.limit}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={close}>
            {c.cancel}
          </Button>
          {(file || error) && (
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setAttempt((n) => n + 1);
              }}
            >
              {c.retry}
            </Button>
          )}
          {file && !error ? (
            <Button
              onClick={() => {
                select(file);
                close();
              }}
            >
              {c.use}
            </Button>
          ) : (
            !error &&
            stream &&
            (kind === "photo" ? (
              <Button onClick={takePhoto}>{c.take}</Button>
            ) : (
              <Button
                onClick={() =>
                  recording ? recorder.current?.stop() : startRecording()
                }
              >
                {recording ? c.stop : c.start}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
