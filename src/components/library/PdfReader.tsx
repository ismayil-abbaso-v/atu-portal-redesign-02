import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
// Vite: worker faylını URL kimi import edirik ki, ayrıca bundle olunsun.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PdfReader({ faylUrl, baslıq }: { faylUrl: string; baslıq: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conteynerRef = useRef<HTMLDivElement>(null);
  const senedRef = useRef<PDFDocumentProxy | null>(null);
  const render_id_ref = useRef(0);

  const [yuklenir, setYuklenir] = useState(true);
  const [xeta, setXeta] = useState<string | null>(null);
  const [cariSehife, setCariSehife] = useState(1);
  const [toplamSehife, setToplamSehife] = useState(0);
  const [miqyas, setMiqyas] = useState(1.1);
  const [tamEkran, setTamEkran] = useState(false);

  // Sənədi yüklə
  useEffect(() => {
    let aktiv = true;
    setYuklenir(true);
    setXeta(null);

    const yuklemeTapshirigi = pdfjsLib.getDocument({ url: faylUrl });
    yuklemeTapshirigi.promise
      .then((sened) => {
        if (!aktiv) return;
        senedRef.current = sened;
        setToplamSehife(sened.numPages);
        setCariSehife(1);
        setYuklenir(false);
      })
      .catch(() => {
        if (!aktiv) return;
        setXeta("PDF faylı yüklənə bilmədi.");
        setYuklenir(false);
      });

    return () => {
      aktiv = false;
      void yuklemeTapshirigi.destroy();
      senedRef.current = null;
    };
  }, [faylUrl]);

  // Yalnız cari səhifəni render et (lazy), köhnə səhifəni unmount/təmizlə
  useEffect(() => {
    const sened = senedRef.current;
    const canvas = canvasRef.current;
    if (!sened || !canvas || toplamSehife === 0) return;

    const bu_render_id = ++render_id_ref.current;
    let render_tapshirigi: ReturnType<import("pdfjs-dist").PDFPageProxy["render"]> | null = null;

    void sened.getPage(cariSehife).then((sehife) => {
      // Əgər bu render zamanı başqa səhifəyə keçilibsə, ləğv et
      if (bu_render_id !== render_id_ref.current) return;

      const viewport = sehife.getViewport({ scale: miqyas });
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      render_tapshirigi = sehife.render({ canvasContext: context, viewport, canvas });
      render_tapshirigi.promise.catch(() => {
        /* render ləğv edilibsə səssizcə keç */
      });
    });

    return () => {
      render_tapshirigi?.cancel();
    };
  }, [cariSehife, miqyas, toplamSehife]);

  function tamEkranDəyiş() {
    const el = conteynerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
      setTamEkran(true);
    } else {
      void document.exitFullscreen?.();
      setTamEkran(false);
    }
  }

  useEffect(() => {
    function dinle() {
      setTamEkran(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", dinle);
    return () => document.removeEventListener("fullscreenchange", dinle);
  }, []);

  return (
    <div
      ref={conteynerRef}
      className="flex h-full min-h-[70vh] flex-col overflow-hidden rounded-2xl bg-muted"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <p className="line-clamp-1 text-sm font-bold text-foreground">{baslıq}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            disabled={cariSehife <= 1}
            onClick={() => setCariSehife((s) => Math.max(1, s - 1))}
            aria-label="Əvvəlki səhifə"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 text-center text-xs font-bold text-muted-foreground">
            {toplamSehife > 0 ? `${cariSehife} / ${toplamSehife}` : "—"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            disabled={cariSehife >= toplamSehife}
            onClick={() => setCariSehife((s) => Math.min(toplamSehife, s + 1))}
            aria-label="Növbəti səhifə"
          >
            <ChevronRight className="size-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setMiqyas((m) => Math.max(0.5, +(m - 0.2).toFixed(2)))}
            aria-label="Kiçilt"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setMiqyas((m) => Math.min(3, +(m + 0.2).toFixed(2)))}
            aria-label="Böyüt"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={tamEkranDəyiş}
            aria-label="Tam ekran"
          >
            {tamEkran ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {yuklenir ? (
          <Loader2 className="size-8 animate-spin text-primary" />
        ) : xeta ? (
          <p className="text-sm text-muted-foreground">{xeta}</p>
        ) : (
          <canvas ref={canvasRef} className="max-w-full rounded-lg bg-white shadow" />
        )}
      </div>
    </div>
  );
}
