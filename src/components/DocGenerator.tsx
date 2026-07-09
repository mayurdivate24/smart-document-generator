/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Download,
  Printer,
  RefreshCw,
  Folder,
  FileSpreadsheet,
  AlertCircle,
  FolderOpen,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { api } from "../lib/api";
import { PdfCanvasViewer } from "./PdfCanvasViewer";

export default function DocGenerator() {
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [dropdowns, setDropdowns] = useState<any[]>([]);
  const [orgProfiles, setOrgProfiles] = useState<any[]>([]);

  // Selection state
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTplId, setSelectedTplId] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  // Form values state
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Branding option states
  const [brandingOption, setBrandingOption] = useState<"none" | "profile">("none");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Workflow states
  const [step, setStep] = useState<"select" | "form" | "preview" | "download">("select");
  const [tplSearchQuery, setTplSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  // Preview options
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfErrorDetail, setPdfErrorDetail] = useState<{ statusCode: number; failedUrl: string; message: string } | null>(null);

  useEffect(() => {
    if (step === "preview" && generatedDoc) {
      setPdfLoading(true);
      setPdfErrorDetail(null);

      const url = api.getDocumentPdfPreviewUrl(generatedDoc.id);

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
  }, [step, generatedDoc?.id]);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.getCategories(),
      api.getTemplates(),
      api.getDropdowns(),
      api.getOrganizationProfiles(),
    ])
      .then(([cats, tpls, dds, profiles]) => {
        setCategories(cats);
        // Only show unarchived templates for users
        setTemplates(tpls.filter((t) => !t.isArchived));
        setDropdowns(dds);
        setOrgProfiles(profiles);

        if (cats.length > 0) {
          setSelectedCatId(cats[0].id);
        }
        if (profiles.length > 0) {
          setSelectedProfileId(profiles[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Filter templates by category and search query
  const filteredTemplates = templates.filter((t) => {
    const matchesCat = !selectedCatId || t.categoryId === selectedCatId;
    const matchesSearch =
      tplSearchQuery === "" ||
      t.name.toLowerCase().includes(tplSearchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(tplSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTplId(tpl.id);
    setActiveTemplate(tpl);

    // Initialize form values with defaults or empty strings, or auto-filled dates/years
    const initialVals: Record<string, string> = {};
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    
    // Format today as YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    tpl.placeholders.forEach((p: any) => {
      if (p.defaultValue) {
        initialVals[p.placeholder] = p.defaultValue;
      } else {
        const labelLower = (p.label || "").toLowerCase();
        const placeholderLower = (p.placeholder || "").toLowerCase();

        // Detect Only Year field
        if ((placeholderLower.includes("year") || labelLower.includes("year")) && p.inputType !== "date") {
          initialVals[p.placeholder] = currentYear;
        }
        // Detect Full Date field
        else if (p.inputType === "date" || placeholderLower.includes("date") || labelLower.includes("date")) {
          initialVals[p.placeholder] = todayStr;
        } else {
          initialVals[p.placeholder] = "";
        }
      }
    });
    setFormValues(initialVals);
    setStep("form");
  };

  const handleInputChange = (placeholder: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [placeholder]: val }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError("");

    api.generateDocument(selectedTplId, formValues, brandingOption, selectedProfileId)
      .then((doc) => {
        setGeneratedDoc(doc);
        setStep("preview");
      })
      .catch((err) => {
        setError(err.message || "Failed to generate document.");
      })
      .finally(() => {
        setGenerating(false);
      });
  };

  const downloadDocx = () => {
    if (!generatedDoc) return;
    const url = api.getDocumentDownloadDocxUrl(generatedDoc.id);
    const filename = `${generatedDoc.documentNumber}.docx`;
    api.downloadAsBlob(url, filename).catch((err) => {
      console.error("DOCX download failure:", err);
      alert("Failed to download Word file.");
    });
  };

  const downloadPdf = async () => {
    if (!generatedDoc) return;
    const url = api.getDocumentDownloadPdfUrl(generatedDoc.id);
    const filename = `${generatedDoc.documentNumber || "document"}.pdf`;
    api.downloadAsBlob(url, filename).catch((err) => {
      console.error("PDF download failure:", err);
      alert("Failed to download PDF file.");
    });
  };

  const handlePrint = () => {
    if (!generatedDoc) return;
    const url = api.getDocumentPdfViewUrl(generatedDoc.id);
    const win = window.open(url, "_blank");
    if (win) win.focus();
  };

  // Group fields by section name
  const groupedFields = activeTemplate
    ? activeTemplate.placeholders
        .filter((p: any) => !p.hideField)
        .reduce((acc: Record<string, any[]>, p: any) => {
          const grp = p.grouping || "General Information";
          if (!acc[grp]) acc[grp] = [];
          acc[grp].push(p);
          return acc;
        }, {})
    : {};

  return (
    <div className="space-y-8">
      {/* Breadcrumbs Navigation / Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
            <span
              className={`hover:underline cursor-pointer ${step === "select" ? "text-blue-600" : ""}`}
              onClick={() => {
                setGeneratedDoc(null);
                setStep("select");
              }}
            >
              1. Select Template
            </span>
            <ChevronRight className="w-3 h-3" />
            <span
              className={`hover:underline cursor-pointer ${step === "form" ? "text-blue-600" : ""}`}
              onClick={() => {
                if (activeTemplate) {
                  setGeneratedDoc(null);
                  setStep("form");
                }
              }}
            >
              2. Data Entry Form
            </span>
            {(step === "preview" || step === "download") && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span
                  className={`hover:underline cursor-pointer ${step === "preview" ? "text-blue-600" : ""}`}
                  onClick={() => {
                    if (generatedDoc) {
                      setStep("preview");
                    }
                  }}
                >
                  3. Print & Preview
                </span>
              </>
            )}
            {step === "download" && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-blue-600 font-bold">4. Download Files</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Document Generation Hub
          </h1>
        </div>
      </div>

      {/* STEP 1: SELECT CATEGORY & TEMPLATE */}
      {step === "select" && (
        <div className="space-y-6">
          {/* Mobile Search and Category Chips */}
          <div className="block lg:hidden space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search template names & descriptions..."
                value={tplSearchQuery}
                onChange={(e) => setTplSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-12"
              />
            </div>
            
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    selectedCatId === cat.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {cat.name} ({templates.filter((t) => t.categoryId === cat.id).length})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Category Sidebar - Desktop only */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-fit space-y-2">
              <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider mb-4 px-2 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5" /> Category Filter
              </h3>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition duration-150 flex items-center justify-between cursor-pointer ${
                    selectedCatId === cat.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedCatId === cat.id ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                    }`}
                  >
                    {templates.filter((t) => t.categoryId === cat.id).length}
                  </span>
                </button>
              ))}
            </div>

          {/* Templates Grid */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="font-bold text-gray-800 dark:text-white text-base">
              Available Templates Under Selected Category
            </h2>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-gray-100 dark:border-gray-700 rounded-3xl bg-white dark:bg-gray-800">
                <FileSpreadsheet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400 mt-2 font-medium">No templates available in this category.</p>
                <p className="text-xs text-gray-400 mt-1">Please upload or activate templates in administrator dashboard.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="group p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-blue-200 dark:hover:border-blue-900 shadow-sm text-left transition duration-150 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl w-fit mb-4">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="font-extrabold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {tpl.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700 mt-5 pt-3 w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {tpl.placeholders?.length || 0} fields
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                        Configure <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* STEP 2: DATA ENTRY FORM */}
      {step === "form" && activeTemplate && (
        <form onSubmit={handleGenerate} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden max-w-4xl mx-auto">
          <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-white">
                Enter Details for "{activeTemplate.name}"
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Fill the fields below to automatically replace Word placeholders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setGeneratedDoc(null);
                setStep("select");
              }}
              className="text-xs font-bold text-gray-500 hover:underline cursor-pointer"
            >
              Back to templates
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {Object.keys(groupedFields).map((groupName) => (
              <div key={groupName} className="space-y-4">
                <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 border-b border-indigo-50/30 pb-2 flex items-center gap-1">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-full inline-block"></span>
                  {groupName}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedFields[groupName]
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((field) => {
                      const isLinkedDropdown =
                        (field.inputType === "dropdown" || field.inputType === "radio") &&
                        field.linkedDropdownId;
                      const linkedList = isLinkedDropdown
                        ? dropdowns.find((d) => d.id === field.linkedDropdownId)
                        : null;

                      return (
                        <div key={field.placeholder} className="space-y-1">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center justify-between">
                            <span>
                              {field.label}{" "}
                              {field.required && <span className="text-red-500">*</span>}
                            </span>
                            {field.helpText && (
                              <span className="text-[10px] text-gray-400 font-medium normal-case">
                                {field.helpText}
                              </span>
                            )}
                          </label>

                          {/* Render custom input formats */}
                          {field.inputType === "textarea" ? (
                            <textarea
                              placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
                              value={formValues[field.placeholder] || ""}
                              onChange={(e) => handleInputChange(field.placeholder, e.target.value)}
                              required={field.required}
                              readOnly={field.readOnly}
                              rows={3}
                              className="w-full px-4 py-2.5 md:py-2 text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none min-h-[48px] md:min-h-0"
                            />
                          ) : field.inputType === "dropdown" ? (
                            <select
                              value={formValues[field.placeholder] || ""}
                              onChange={(e) => handleInputChange(field.placeholder, e.target.value)}
                              required={field.required}
                              disabled={field.readOnly}
                              className="w-full px-4 py-2.5 md:py-2 text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none min-h-[48px] md:min-h-0"
                            >
                              <option value="">-- Choose Option --</option>
                              {linkedList ? (
                                linkedList.options.map((opt: string) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))
                              ) : (
                                <option value="">No dropdown options linked</option>
                              )}
                            </select>
                          ) : field.inputType === "radio" ? (
                            <div className="flex flex-wrap gap-4 pt-1">
                              {linkedList ? (
                                linkedList.options.map((opt: string) => (
                                  <label key={opt} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                      type="radio"
                                      name={field.placeholder}
                                      value={opt}
                                      checked={formValues[field.placeholder] === opt}
                                      onChange={(e) => handleInputChange(field.placeholder, e.target.value)}
                                      disabled={field.readOnly}
                                      className="text-blue-600 focus:ring-blue-500"
                                    />
                                    {opt}
                                  </label>
                                ))
                              ) : (
                                <p className="text-[10px] text-gray-400">No options configured.</p>
                              )}
                            </div>
                          ) : field.inputType === "checkbox" ? (
                            <div className="pt-1">
                              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={formValues[field.placeholder] === "Yes"}
                                  onChange={(e) =>
                                    handleInputChange(field.placeholder, e.target.checked ? "Yes" : "No")
                                  }
                                  disabled={field.readOnly}
                                  className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                                />
                                Check to confirm ("Yes" option)
                              </label>
                            </div>
                          ) : (
                            <input
                              type={field.inputType || "text"}
                              placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
                              value={formValues[field.placeholder] || ""}
                              onChange={(e) => handleInputChange(field.placeholder, e.target.value)}
                              required={field.required}
                              readOnly={field.readOnly}
                              pattern={field.validationRegex || undefined}
                              className="w-full px-4 py-2.5 md:py-2 text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none min-h-[48px] md:min-h-0"
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            {/* Optional Organization Branding Panel */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 rounded-lg">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </span>
                <h3 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                  Organization Branding & Overlays (Optional)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBrandingOption("none")}
                  className={`p-4 border text-left rounded-2xl transition duration-150 cursor-pointer ${
                    brandingOption === "none"
                      ? "border-blue-500 bg-blue-50/10 dark:bg-blue-950/10"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-800 dark:text-white">None (Default)</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                    {activeTemplate.brandingMode === "built-in"
                      ? "Preserves the original Word document layout exactly. Best since headers are built-in."
                      : "Generates plain layout with no dynamic letterhead headers, footers, logos or borders."}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBrandingOption("profile")}
                  disabled={orgProfiles.length === 0}
                  className={`p-4 border text-left rounded-2xl transition duration-150 cursor-pointer ${
                    brandingOption === "profile"
                      ? "border-blue-500 bg-blue-50/10 dark:bg-blue-950/10"
                      : orgProfiles.length === 0
                      ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-800 dark:text-white">Use Organization Profile</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                    Applies custom letterhead styles, digital signatures, PAN/GST tags, contact text overlays, and backgrounds.
                  </p>
                </button>
              </div>

              {brandingOption === "profile" && orgProfiles.length > 0 && (
                <div className="bg-blue-50/10 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100/30 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Choose Active Profile
                    </label>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full max-w-md px-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
                    >
                      {orgProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.organizationName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTemplate.brandingMode === "built-in" && brandingOption === "profile" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-xl text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Warning: This template specifies <strong>Built-in Letterhead</strong>. Applying a dynamic profile overlay may result in duplicate logos/letterhead details on the compiled preview.
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 mx-6 md:mx-8 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="p-4 md:p-8 border-t border-gray-50 dark:border-gray-700 flex flex-col-reverse md:flex-row justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none w-full">
            <button
              type="button"
              onClick={() => {
                setGeneratedDoc(null);
                setStep("select");
              }}
              className="w-full md:w-auto px-5 py-3 md:py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl cursor-pointer flex items-center justify-center h-12 md:h-auto font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="w-full md:w-auto px-6 py-3 md:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer h-12 md:h-auto"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Replacing variables...
                </>
              ) : (
                <>
                  Compile Document <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: HIGH FIDELITY PREVIEW & PRINT/DOWNLOAD */}
      {step === "preview" && generatedDoc && (
        <div className="space-y-6">
          {/* Action Ribbon Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={downloadDocx}
                  className="hidden md:flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Word (.docx)
                </button>
                <button
                  onClick={downloadPdf}
                  className="hidden md:flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF (.pdf)
                </button>

                {/* Mobile Next: Download button */}
                <button
                  onClick={() => setStep("download")}
                  className="flex md:hidden w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-extrabold items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer h-12"
                >
                  Next: Download Options <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const url = api.getDocumentPdfPreviewUrl(generatedDoc.id);
                    window.open(url, "_blank");
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/10 cursor-pointer justify-center"
                  title="Open Raw Preview URL"
                  id="open-raw-preview-ribbon-btn"
                >
                  <Eye className="w-3.5 h-3.5" /> Open Raw Preview URL
                </button>
                <button
                  onClick={() => {
                    const url = api.getDocumentPdfPreviewUrl(generatedDoc.id);
                    const win = window.open(url, "_blank");
                    if (win) win.focus();
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer justify-center"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setGeneratedDoc(null);
                    setStep("select");
                  }}
                  className="w-full md:w-auto px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-bold rounded-xl cursor-pointer text-center"
                >
                  Done
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Native PDF View Frame using Client-Side PDF.js */}
          <div className="bg-gray-100 dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800/80 overflow-hidden flex flex-col items-stretch relative min-h-[600px]">
            <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 p-3 px-6 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span><strong>High-Fidelity PDF Canvas Preview:</strong> Rendering document pages using PDF.js. Click button to view raw stream.</span>
              </div>
              <button 
                onClick={() => window.open(api.getDocumentPdfPreviewUrl(generatedDoc.id), "_blank")}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                id="open-raw-preview-banner-btn"
              >
                Open Raw Preview URL
              </button>
            </div>

            <PdfCanvasViewer url={api.getDocumentPdfPreviewUrl(generatedDoc.id)} />
          </div>
        </div>
      )}

      {/* STEP 4: DOWNLOAD STAGE */}
      {step === "download" && generatedDoc && (
        <div className="max-w-2xl mx-auto text-center space-y-8 py-8 md:py-12 px-4">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Document Compiled Successfully!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Your template placeholders, dynamic letterhead alignments, and digital profile stamps have been written to files.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm text-left space-y-4">
            <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider">
              Document Specifications
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block font-medium">Document ID</span>
                <span className="font-bold text-gray-800 dark:text-white">{generatedDoc.documentNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Category</span>
                <span className="font-bold text-gray-800 dark:text-white">{generatedDoc.categoryName}</span>
              </div>
              <div className="col-span-2 border-t border-gray-50 dark:border-gray-700/50 pt-3">
                <span className="text-gray-400 block font-medium">Template Title</span>
                <span className="font-bold text-gray-800 dark:text-white text-sm">{generatedDoc.templateName}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={downloadDocx}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Word Document (.docx)
            </button>
            
            <button
              onClick={downloadPdf}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Download Adobe PDF (.pdf)
            </button>

            <div className="pt-6 flex gap-3">
              <button
                onClick={() => setStep("preview")}
                className="w-1/2 h-11 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer"
              >
                ← Back to Preview
              </button>
              <button
                onClick={() => {
                  setGeneratedDoc(null);
                  setStep("select");
                }}
                className="w-1/2 h-11 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Generate Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
