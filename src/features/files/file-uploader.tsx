import { Camera, Mic, Upload } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fileCopy } from "./file-copy";

export function FileUploader({
  selected,
  busy = false,
  uploading = false,
  percent = 0,
  select,
  choose,
  capture,
  upload,
  error,
  notice,
}: {
  selected?: File | null;
  busy?: boolean;
  uploading?: boolean;
  percent?: number;
  select: (file: File | null) => void;
  choose?: () => void;
  capture: (kind: "photo" | "voice") => void;
  upload?: () => void;
  error?: ReactNode;
  notice?: ReactNode;
}) {
  const { locale } = useLocale(),
    c = fileCopy[locale];
  const input = useRef<HTMLInputElement>(null),
    depth = useRef(0);
  const [dragging, setDragging] = useState(false),
    [multiple, setMultiple] = useState(false);
  function pick() {
    setMultiple(false);
    if (choose) choose();
    else input.current?.click();
  }
  return (
    <fieldset
      aria-label={c.choose}
      className={`document-upload-shell${dragging ? " is-dragging" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!busy && e.dataTransfer.types.includes("Files")) {
          depth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = busy ? "none" : "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (busy) return;
        const files = e.dataTransfer.files;
        if (!files.length) return;
        setMultiple(files.length !== 1);
        if (files.length === 1) {
          if (choose) choose();
          else select(files[0]);
        }
      }}
    >
      <div className="document-upload">
        <div className="document-drop-target">
          <Upload size={24} aria-hidden="true" />
          <p>
            {dragging ? (
              c.drop
            ) : (
              <>
                {c.drag}{" "}
                <button
                  className="document-choose"
                  type="button"
                  disabled={busy}
                  onClick={pick}
                >
                  {c.choose}
                </button>
              </>
            )}
          </p>
          <p className="helper-text" id="project-file-hint">
            {c.hint}
          </p>
          {!choose && (
            <input
              ref={input}
              id="project-file-input"
              hidden
              aria-label={c.choose}
              aria-describedby="project-file-hint"
              tabIndex={-1}
              type="file"
              accept=".dxf,.pdf,.jpg,.jpeg,.png,.webp,.txt,.docx,.xlsx,.webm,.m4a,.ogg"
              disabled={busy}
              onChange={(e) => {
                setMultiple(false);
                const file = e.target.files?.[0];
                if (file) select(file);
                e.target.value = "";
              }}
            />
          )}
        </div>
        <div className="capture-actions">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => capture("photo")}
          >
            <Camera size={18} aria-hidden="true" />
            {c.photo}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => capture("voice")}
          >
            <Mic size={18} aria-hidden="true" />
            {c.voice}
          </Button>
        </div>
        {selected && (
          <div className="document-upload-selection">
            <div className="document-selected" role="status">
              <strong>{selected.name}</strong>
              <small>
                {new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 1,
                }).format(selected.size / 1024)}{" "}
                KiB · {c.notUploaded}
              </small>
            </div>
            <div className="document-selection-actions">
              <Button variant="ghost" disabled={busy} onClick={pick}>
                {c.change}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => select(null)}
              >
                {c.clearSelection}
              </Button>
              <Button disabled={busy} onClick={upload}>
                {uploading ? c.uploading : c.upload}
              </Button>
            </div>
          </div>
        )}
        {selected && uploading && (
          <div className="document-upload-progress" role="status">
            <progress aria-label={c.progress} max={100} value={percent} />
            <span>{percent}%</span>
          </div>
        )}
        {multiple && (
          <p role="alert" className="error-message">
            {c.single}
          </p>
        )}
        {error}
        {notice}
      </div>
    </fieldset>
  );
}
