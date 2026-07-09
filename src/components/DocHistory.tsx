/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  History,
  Search,
  Download,
  Eye,
  Calendar,
  Layers,
  Filter,
  X,
  Printer,
  ZoomIn,
  ZoomOut,
  FileText,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { PdfCanvasViewer } from "./PdfCanvasViewer";

export default function DocHistory() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Preview overlay state
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [zoom, setZoom] = useState(100);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfErrorDetail, setPdfErrorDetail] = useState<{ statusCode: number; failedUrl: string; message: string } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (previewDoc) {
      setPdfLoading(true);
      setPdfErrorDetail(null);

      const url = api.getDocumentPdfPreviewUrl(previewDoc.id);

      fetch(url)
        .then(async (res) => {
          if (res.ok) {
            setPdfLoading(false);
          } else {
            let backendError = "Unknown error";
            try {
              const data = await res.json();
              backendError = data.error || data.message || JSON.stringify(data);
            } catch {
              try {
                backendError = await res.text();
              } catch {}
            }
            setPdfErrorDetail({
              statusCode: res.status,
              failedUrl: url,
              message: backendError || `HTTP error ${res.status}`
            });
            setPdfLoading(false);
          }
        })
        .catch((err) => {
          setPdfErrorDetail({
            statusCode: 0,
            failedUrl: url,
            message: err.message || "Network request failed"
          });
          setPdfLoading(false);
        });
    }
  }, [previewDoc?.id]);

  const loadHistory = () => {
    setLoading(true);
    api.getDocuments()
      .then((data) => {
        setDocuments(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load document generation log history.");
      })
      .finally(() => setLoading(false));
  };

  const handleOpenPreview = (doc: any) => {
    setPreviewDoc(doc);
    setPdfLoading(true);
    setPdfErrorDetail(null);
  };

  const downloadDocx = (doc: any) => {
    if (!doc) return;
    const url = api.getDocumentDownloadDocxUrl(doc.id);
    const filename = `${doc.documentNumber}.docx`;
    api.downloadAsBlob(url, filename).catch((err) => {
      console.error("DOCX download failure:", err);
      alert("Failed to download Word file.");
    });
  };

  const downloadPdfDirect = (doc: any) => {
    if (!doc) return;
    const url = api.getDocumentDownloadPdfUrl(doc.id);
    const filename = `${doc.documentNumber || "document"}.pdf`;
    api.downloadAsBlob(url, filename).catch((err) => {
      console.error("PDF download failure:", err);
      alert("Failed to download PDF file.");
    });
  };

  const downloadPdf = () => {
    if (!previewDoc) return;
    downloadPdfDirect(previewDoc);
  };

  // Extract unique categories & templates from logs for filtering dropdowns
  const uniqueCategories = Array.from(new Set(documents.map((d) => d.categoryName)));
  const uniqueTemplates = Array.from(new Set(documents.map((d) => d.templateName)));

  // Filter logic
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.generatedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(doc.values).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCat ? doc.categoryName === selectedCat : true;
    const matchesTemplate = selectedTemplate ? doc.templateName === selectedTemplate : true;

    // Date bounds evaluation
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(doc.createdAt) >= new Date(startDate);
    }
    if (endDate) {
      // Add 23h 59m to include whole ending date
      const endWithTime = new Date(endDate);
      endWithTime.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(doc.createdAt) <= endWithTime;
    }

    return matchesSearch && matchesCat && matchesTemplate && matchesDate;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-600" />
          Document History & Archives
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Review, search, and download previously compiled document versions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search everywhere */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by doc number, client name, template, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Category selection */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Template filter */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Layers className="w-3.5 h-3.5" />
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">All Templates</option>
                {uniqueTemplates.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History log entries */}
      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Querying transaction log history...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm">
          <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-sm font-medium text-gray-500 mt-3">No matching documents found.</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-gray-50 dark:divide-gray-700/50">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {doc.categoryName}
                    </span>
                    <h4 className="font-extrabold text-gray-900 dark:text-white text-base mt-0.5">
                      {doc.templateName}
                    </h4>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">{doc.documentNumber}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-full">
                    {(() => {
                      const d = new Date(doc.createdAt);
                      if (isNaN(d.getTime())) return "Invalid Date";
                      const day = String(d.getDate()).padStart(2, "0");
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const year = d.getFullYear();
                      return `${day}-${month}-${year}`;
                    })()}
                  </span>
                </div>

                <div className="text-xs border-t border-gray-50 dark:border-gray-800 pt-3">
                  <span className="text-gray-400 font-semibold uppercase text-[9px] block">Generated By</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{doc.generatedBy.name}</span>
                  <span className="text-gray-400 block text-[10px]">{doc.generatedBy.email}</span>
                </div>

                {/* Mobile Touch-Friendly Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleOpenPreview(doc)}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition cursor-pointer h-11"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button
                    onClick={() => downloadDocx(doc)}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition cursor-pointer h-11"
                  >
                    <Download className="w-4 h-4" /> DOCX
                  </button>
                  <button
                    onClick={() => downloadPdfDirect(doc)}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition cursor-pointer h-11"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="py-4 px-6">Document Number</th>
                  <th className="py-4 px-4">Template</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Generated By</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition">
                    <td className="py-4 px-6 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {doc.documentNumber}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-800 dark:text-white">{doc.templateName}</td>
                    <td className="py-4 px-4 text-xs font-semibold">
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                        {doc.categoryName}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {doc.generatedBy.name}
                      </div>
                      <div className="text-[10px] text-gray-400">{doc.generatedBy.email}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {(() => {
                        const d = new Date(doc.createdAt);
                        if (isNaN(d.getTime())) return "Invalid Date";
                        const day = String(d.getDate()).padStart(2, "0");
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const year = d.getFullYear();
                        return `${day}-${month}-${year}`;
                      })()} &bull;{" "}
                      {new Date(doc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5 flex justify-end">
                      <button
                        onClick={() => handleOpenPreview(doc)}
                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                        title="Preview generated document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadDocx(doc)}
                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer"
                        title="Download replaced Word document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadPdfDirect(doc)}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg transition cursor-pointer"
                        title="Download replaced PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OVERLAY SCREEN: LANDSCAPE PREVIEW AND DOWNLOAD PREVIEW FOR SPECIFIC HISTORIC FILE */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 md:px-8 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-900/30">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Document Preview Engine (PDF Source of Truth)
                </span>
                <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {previewDoc.documentNumber} ({previewDoc.templateName})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* PDF generation precise buttons */}
                <button
                  onClick={() => downloadDocx(previewDoc)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                  title="Download DOCX"
                >
                  <Download className="w-3.5 h-3.5" /> Word (.docx)
                </button>
                <button
                  onClick={downloadPdf}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" /> PDF (.pdf)
                </button>
                <button
                  onClick={() => {
                    const url = api.getDocumentPdfPreviewUrl(previewDoc.id);
                    window.open(url, "_blank");
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                  title="Open Raw Preview URL"
                  id="open-raw-preview-history-ribbon-btn"
                >
                  <Eye className="w-3.5 h-3.5" /> Open Raw Preview URL
                </button>
                <button
                  onClick={() => {
                    const url = api.getDocumentPdfPreviewUrl(previewDoc.id);
                    const win = window.open(url, "_blank");
                    if (win) win.focus();
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Print"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>

                <div className="h-5 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                <button
                  onClick={() => {
                    setPreviewDoc(null);
                  }}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* High-fidelity PDF View Frame using Client-Side PDF.js */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-950 flex flex-col items-stretch p-0 relative min-h-[600px]">
              <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 p-3 px-6 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💡</span>
                  <span><strong>High-Fidelity PDF Canvas Preview:</strong> Rendering document pages using PDF.js. Click button to view raw stream.</span>
                </div>
                <button 
                  onClick={() => window.open(api.getDocumentPdfPreviewUrl(previewDoc.id), "_blank")}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                  id="open-raw-preview-history-banner-btn"
                >
                  Open Raw Preview URL
                </button>
              </div>

              <PdfCanvasViewer url={api.getDocumentPdfPreviewUrl(previewDoc.id)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
