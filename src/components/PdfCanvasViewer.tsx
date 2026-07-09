import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { RefreshCw, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Configure worker using cdnjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfPageCanvasProps {
  pdfPage: any;
  scale: number;
}

const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({ pdfPage, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any active render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    const viewport = pdfPage.getViewport({ scale });
    
    // Set backing store dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    const renderTask = pdfPage.render(renderContext);
    renderTaskRef.current = renderTask;

    renderTask.promise.then(
      () => {
        renderTaskRef.current = null;
      },
      (err: any) => {
        if (err?.name === "RenderingCancelledException") {
          // Task cancelled, safe to ignore
        } else {
          console.error("PDF page render error:", err);
        }
      }
    );

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfPage, scale]);

  return (
    <div className="shadow-lg border border-gray-200/50 dark:border-gray-800/80 bg-white dark:bg-gray-900 rounded-xl overflow-hidden mx-auto my-6 transition-all duration-300 max-w-full">
      <canvas ref={canvasRef} className="max-w-full h-auto block mx-auto" />
    </div>
  );
};

interface PdfCanvasViewerProps {
  url: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ url }) => {
  const [pdf, setPdf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [zoom, setZoom] = useState(100); // Zoom percentage (50% - 200%)

  const fetchAndRenderPdf = () => {
    let active = true;
    setLoading(true);
    setError(null);
    setPages([]);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          let errMsg = `Failed to download PDF stream (HTTP status ${res.status})`;
          try {
            const data = await res.json();
            if (data && data.error) {
              errMsg = data.error;
            }
          } catch {
            // Not a JSON response
          }
          throw new Error(errMsg);
        }
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (!active) return;
        return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      })
      .then((pdfDoc) => {
        if (!active || !pdfDoc) return;
        setPdf(pdfDoc);
        
        // Load all pages sequentially to render them correctly
        const pagePromises = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pagePromises.push(pdfDoc.getPage(i));
        }
        return Promise.all(pagePromises);
      })
      .then((loadedPages) => {
        if (!active) return;
        if (loadedPages) {
          setPages(loadedPages);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading PDF with PDF.js:", err);
        if (active) {
          setError(err.message || "Failed to parse PDF data. Please retry.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  };

  useEffect(() => {
    const cleanup = fetchAndRenderPdf();
    return () => {
      if (cleanup) cleanup();
    };
  }, [url]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4 bg-gray-50/50 dark:bg-gray-950/40 py-20">
        <RefreshCw className="w-9 h-9 text-indigo-600 dark:text-indigo-400 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200">Processing document layout...</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Converting vector data to high-fidelity presentation</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-950/40 py-20">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 text-2xl font-black mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h4 className="text-base font-extrabold text-gray-900 dark:text-white mb-2">Rendering Engine Error</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
          The PDF document was generated successfully, but the canvas rendering engine could not compile the preview:
          <br />
          <span className="font-mono mt-2 block p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-lg text-red-800 dark:text-red-300">
            {error}
          </span>
        </p>
        <button
          onClick={fetchAndRenderPdf}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
        >
          Retry Compilation
        </button>
      </div>
    );
  }

  const scale = zoom / 100;

  return (
    <div className="flex-1 flex flex-col items-stretch overflow-hidden bg-gray-100/50 dark:bg-gray-950/50">
      {/* Zoom Control Ribbon */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2.5 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Zoom Out"
            id="pdf-zoom-out-btn"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono text-xs font-black rounded-lg min-w-[60px] text-center">
            {zoom}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Zoom In"
            id="pdf-zoom-in-btn"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomReset}
            disabled={zoom === 100}
            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Reset Zoom"
            id="pdf-zoom-reset-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest hidden sm:block">
          Pages: {pages.length} | Client-Side Render
        </div>
      </div>

      {/* Pages Container with Vertical Scroll */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          {pages.map((page, idx) => (
            <PdfPageCanvas key={idx} pdfPage={page} scale={scale} />
          ))}
        </div>
      </div>
    </div>
  );
};
