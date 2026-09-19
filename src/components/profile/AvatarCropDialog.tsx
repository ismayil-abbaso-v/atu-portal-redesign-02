import { Check, Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AvatarCropDialogProps = {
  file: File | null;
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const SIZE = 320;
const OUTPUT_SIZE = 512;

export function AvatarCropDialog({ file, open, loading = false, onCancel, onConfirm }: AvatarCropDialogProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNaturalSize({ width: 0, height: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !src) return null;

  const baseScale = naturalSize.width && naturalSize.height
    ? Math.max(SIZE / naturalSize.width, SIZE / naturalSize.height)
    : 1;
  const renderedWidth = naturalSize.width * baseScale * zoom;
  const renderedHeight = naturalSize.height * baseScale * zoom;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY };
    offsetStart.current = offset;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.current.x + event.clientX - dragStart.current.x,
      y: offsetStart.current.y + event.clientY - dragStart.current.y,
    });
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = () => {
    const image = imageRef.current;
    if (!image || !naturalSize.width || !naturalSize.height) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;

    const outputScale = OUTPUT_SIZE / SIZE;
    const scale = baseScale * zoom;
    const drawWidth = naturalSize.width * scale;
    const drawHeight = naturalSize.height * scale;
    const left = (SIZE - drawWidth) / 2 + offset.x;
    const top = (SIZE - drawHeight) / 2 + offset.y;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, left * outputScale, top * outputScale, drawWidth * outputScale, drawHeight * outputScale);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const base = file?.name.replace(/\.[^.]+$/, "") || "profil-shekli";
      onConfirm(new File([blob], `${base}-profil.webp`, { type: "image/webp" }));
    }, "image/webp", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[140] flex h-[100dvh] min-h-0 items-center justify-center overflow-y-auto overscroll-contain bg-black/70 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <div className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md min-h-0 flex-col overflow-hidden rounded-3xl bg-card shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-3">
            <h3 id="avatar-crop-title" className="font-bold text-foreground">Profil şəklini yerləşdir</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Instagram kimi sürüşdür, böyüt və uyğun hissəni seç.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={loading} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted disabled:opacity-50" aria-label="Bağla"><X className="size-4" /></button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div
            className="relative mx-auto size-[min(72vw,288px)] max-w-full touch-none overflow-hidden rounded-2xl bg-muted select-none sm:size-80"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            style={{ cursor: dragging ? "grabbing" : "grab" }}
          >
            <img
              ref={imageRef}
              src={src}
              alt="Şəkil önizləməsi"
              draggable={false}
              onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              className="absolute max-w-none"
              style={{ width: renderedWidth || SIZE, height: renderedHeight || SIZE, left: "50%", top: "50%", transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-primary/80" />
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
          </div>

          <div className="mt-4 flex items-center gap-3 sm:mt-5">
            <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
            <input aria-label="Şəkil böyütmə" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-primary" />
            <span className="w-10 shrink-0 text-right text-xs font-semibold text-muted-foreground">{Math.round(zoom * 100)}%</span>
          </div>

          <p className="mt-2 text-center text-xs text-muted-foreground">Şəkli barmağınızla və ya siçanla sürüşdürərək yerləşdirin.</p>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={reset} disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RotateCcw className="size-4" />Sıfırla</button>
            <button type="button" onClick={confirm} disabled={loading || !naturalSize.width} className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"><Check className="size-4" />{loading ? "Yüklənir..." : "Şəkli yadda saxla"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
