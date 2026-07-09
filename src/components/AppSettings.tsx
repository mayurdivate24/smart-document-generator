/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Sliders,
  Image as ImageIcon,
  FileText,
  Check,
  AlertCircle,
  Plus,
  Trash,
  Edit3,
  Building,
  Globe,
  Mail,
  Phone,
  FileSignature,
  Layout,
  Notebook,
} from "lucide-react";
import { api } from "../lib/api";

export default function AppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"presets" | "profiles">("presets");
  const [presetsExpanded, setPresetsExpanded] = useState(true);
  const [profilesExpanded, setProfilesExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- GENERAL PRESETS STATE ---
  const [orgName, setOrgName] = useState("");
  const [address, setAddress] = useState("");
  const [footer, setFooter] = useState("");
  const [paperSize, setPaperSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [numberPattern, setNumberPattern] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState<"en" | "hi" | "mr">("en");
  const [placeholderSyntax, setPlaceholderSyntax] = useState("all");

  // Margins
  const [marginTop, setMarginTop] = useState(1);
  const [marginBottom, setMarginBottom] = useState(1);
  const [marginLeft, setMarginLeft] = useState(1);
  const [marginRight, setMarginRight] = useState(1);

  // Logo & Signature Base64 uploads
  const [logoBase64, setLogoBase64] = useState("");
  const [sigBase64, setSigBase64] = useState("");

  // --- MULTIPLE PROFILES STATE ---
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<{ id: string; name: string } | null>(null);

  const fetchProfiles = () => {
    api.getOrganizationProfiles()
      .then(setProfiles)
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([api.getSettings(), api.getOrganizationProfiles()])
      .then(([settingsData, profilesData]) => {
        // Load presets
        setOrgName(settingsData.organizationName || "");
        setAddress(settingsData.address || "");
        setFooter(settingsData.footer || "");
        setPaperSize(settingsData.defaultPaperSize || "A4");
        setNumberPattern(settingsData.documentNumberPattern || "");
        setTimezone(settingsData.timezone || "");
        setLanguage(settingsData.language || "en");
        setPlaceholderSyntax(settingsData.placeholderSyntax || "all");

        if (settingsData.defaultMargins) {
          setMarginTop(settingsData.defaultMargins.top);
          setMarginBottom(settingsData.defaultMargins.bottom);
          setMarginLeft(settingsData.defaultMargins.left);
          setMarginRight(settingsData.defaultMargins.right);
        }

        setLogoBase64(settingsData.logo || "");
        setSigBase64(settingsData.digitalSignature || "");

        // Load profiles
        setProfiles(profilesData);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load platform settings data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "sig") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should not exceed 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === "logo") {
        setLogoBase64(base64String);
      } else {
        setSigBase64(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePresets = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const updated = {
      organizationName: orgName,
      address,
      logo: logoBase64,
      digitalSignature: sigBase64,
      footer,
      defaultMargins: {
        top: marginTop,
        bottom: marginBottom,
        left: marginLeft,
        right: marginRight,
      },
      defaultPaperSize: paperSize,
      documentNumberPattern: numberPattern,
      timezone,
      language,
      placeholderSyntax,
    };

    api.updateSettings(updated)
      .then(() => {
        setSuccess("Global presets successfully saved!");
      })
      .catch((err) => setError(err.message || "Failed to save settings."))
      .finally(() => setSaving(false));
  };

  // --- PROFILE LOGIC ---
  const handleCreateProfileClick = () => {
    setEditingProfile({
      name: "",
      organizationName: "",
      address: "",
      contactNumber: "",
      email: "",
      website: "",
      gstNumber: "",
      panNumber: "",
      footerText: "",
      authorizedSignatory: "",
      logo: "",
      digitalSignature: "",
      letterheadBackground: "",
      headerDesign: "standard",
      footerDesign: "standard",
    });
  };

  const handleEditProfileClick = (p: any) => {
    setEditingProfile({ ...p });
  };

  const handleProfileImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo" | "digitalSignature" | "letterheadBackground"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should not exceed 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setEditingProfile((prev: any) => ({
        ...prev,
        [field]: base64String,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const promise = editingProfile.id
      ? api.updateOrganizationProfile(editingProfile.id, editingProfile)
      : api.createOrganizationProfile(editingProfile);

    promise
      .then(() => {
        setSuccess("Organization profile saved successfully!");
        setEditingProfile(null);
        fetchProfiles();
      })
      .catch((err) => setError(err.message || "Failed to save profile."))
      .finally(() => setSaving(false));
  };

  const handleDeleteProfile = (id: string) => {
    setError("");
    setSuccess("");

    api.deleteOrganizationProfile(id)
      .then(() => {
        setSuccess("Organization profile deleted!");
        fetchProfiles();
      })
      .catch((err) => setError(err.message || "Failed to delete profile."));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Enterprise Platform Settings
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure branding models, multi-organization profiles, numbering schemes, and template formats.
        </p>
      </div>

      {/* Tabs segment controller */}
      <div className="hidden md:flex border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => {
            setActiveTab("presets");
            setEditingProfile(null);
            setError("");
            setSuccess("");
          }}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-150 cursor-pointer ${
            activeTab === "presets"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          }`}
        >
          General System Presets
        </button>
        <button
          onClick={() => {
            setActiveTab("profiles");
            setEditingProfile(null);
            setError("");
            setSuccess("");
          }}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-150 cursor-pointer ${
            activeTab === "profiles"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          }`}
        >
          Organization Profiles ({profiles.length})
        </button>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {(error || success) && (
        <div className="max-w-4xl">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex gap-2 items-center">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: SYSTEM PRESETS */}
      <div className="block md:hidden pt-2">
        <button
          type="button"
          onClick={() => setPresetsExpanded(!presetsExpanded)}
          className="w-full flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm font-bold text-sm text-gray-800 dark:text-white"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            General System Presets
          </span>
          <span className="text-gray-400 text-xs">{presetsExpanded ? "Collapse ▲" : "Expand ▼"}</span>
        </button>
      </div>

      {(!isMobile ? activeTab === "presets" : presetsExpanded) && (
        <form onSubmit={handleSavePresets} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                <Sliders className="w-4 h-4 text-blue-600" /> Organization Presets
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Default Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Corporate Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Default Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    System Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Default Footer text
                  </label>
                  <input
                    type="text"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                <FileText className="w-4 h-4 text-blue-600" /> Presets & Margins
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Document Auto-Number scheme
                  </label>
                  <input
                    type="text"
                    value={numberPattern}
                    onChange={(e) => setNumberPattern(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Paper Size
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="A4">A4 (210 x 297 mm)</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Placeholder Syntax Format
                  </label>
                  <select
                    value={placeholderSyntax}
                    onChange={(e) => setPlaceholderSyntax(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all">Detect and Replace All Formats ({"{{var}}"}, {"<<var>>"}, [[var]], {"${var}"})</option>
                    <option value="double_brace">Double Braces only (e.g. {"{{CLIENT_NAME}}"})</option>
                    <option value="angle_bracket">Angle Brackets only (e.g. &lt;&lt;CLIENT NAME&gt;&gt;)</option>
                    <option value="double_bracket">Double Brackets only (e.g. [[CLIENT_NAME]])</option>
                    <option value="dollar_brace">Dollar Braces only (e.g. {"${CLIENT_NAME}"})</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Configure the delimiters expected within your Word document templates.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Default Margins (inches)
                  </label>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 text-center uppercase mb-1">Top</label>
                      <input
                        type="number"
                        step="0.1"
                        value={marginTop}
                        onChange={(e) => setMarginTop(parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 text-center rounded-lg text-xs bg-gray-50 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 text-center uppercase mb-1">Bottom</label>
                      <input
                        type="number"
                        step="0.1"
                        value={marginBottom}
                        onChange={(e) => setMarginBottom(parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 text-center rounded-lg text-xs bg-gray-50 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 text-center uppercase mb-1">Left</label>
                      <input
                        type="number"
                        step="0.1"
                        value={marginLeft}
                        onChange={(e) => setMarginLeft(parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 text-center rounded-lg text-xs bg-gray-50 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 text-center uppercase mb-1">Right</label>
                      <input
                        type="number"
                        step="0.1"
                        value={marginRight}
                        onChange={(e) => setMarginRight(parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 text-center rounded-lg text-xs bg-gray-50 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                <ImageIcon className="w-4 h-4 text-blue-600" /> System Assets
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    System Logo
                  </label>
                  <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center bg-gray-50/50 dark:bg-gray-900/30">
                    {logoBase64 ? (
                      <div className="space-y-2">
                        <img src={logoBase64} alt="presets logo" className="max-h-20 mx-auto object-contain" />
                        <button
                          type="button"
                          onClick={() => setLogoBase64("")}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-gray-400">No image uploaded</p>
                        <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block mt-1">
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "logo")}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    System Signatory
                  </label>
                  <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center bg-gray-50/50 dark:bg-gray-900/30">
                    {sigBase64 ? (
                      <div className="space-y-2">
                        <img src={sigBase64} alt="presets signature" className="max-h-12 mx-auto object-contain" />
                        <button
                          type="button"
                          onClick={() => setSigBase64("")}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Remove Signature
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-gray-400">No signature uploaded</p>
                        <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block mt-1">
                          Upload Signature
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "sig")}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Presets
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: MULTIPLE ORGANIZATION PROFILES */}
      <div className="block md:hidden pt-4">
        <button
          type="button"
          onClick={() => {
            setProfilesExpanded(!profilesExpanded);
            setEditingProfile(null);
          }}
          className="w-full flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm font-bold text-sm text-gray-800 dark:text-white"
        >
          <span className="flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Organization Profiles ({profiles.length})
          </span>
          <span className="text-gray-400 text-xs">{profilesExpanded ? "Collapse ▲" : "Expand ▼"}</span>
        </button>
      </div>

      {(!isMobile ? activeTab === "profiles" : profilesExpanded) && (
        <div className="space-y-6">
          {!editingProfile ? (
            /* LIST VIEW OF PROFILES */
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">Configured Profiles</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Manage separate branding entities, layout styles, and digital signatures.</p>
                </div>
                <button
                  onClick={handleCreateProfileClick}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Profile
                </button>
              </div>

              {profiles.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
                  <Building className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">No Organization Profiles Registered.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Click "Add New Profile" to set up your first corporate letterhead layout.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleEditProfileClick(p)}
                      className="group p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:border-blue-300 cursor-pointer transition flex flex-col justify-between h-56"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            {p.logo ? (
                              <img src={p.logo} alt="org log miniature" className="h-10 w-10 object-contain rounded border border-gray-100" />
                            ) : (
                              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                                <Building className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold text-sm text-gray-800 dark:text-white group-hover:text-blue-600">{p.name}</h4>
                              <p className="text-[11px] font-bold text-gray-400">{p.organizationName}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingProfile({ id: p.id, name: p.name });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="Delete profile"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-5 border-t border-gray-50 dark:border-gray-700 pt-3 text-[10px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{p.email || "No Email"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{p.contactNumber || "No Phone"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Layout className="w-3.5 h-3.5 shrink-0" />
                            <span className="capitalize">Header: {p.headerDesign}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileSignature className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Signee: {p.authorizedSignatory || "None"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-gray-50 dark:border-gray-700">
                        <span>GSTIN: {p.gstNumber || "N/A"}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                          Edit Profile <Edit3 className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CREATE / EDIT FORM VIEW */
            <form onSubmit={handleSaveProfile} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-gray-800 dark:text-white">
                    {editingProfile.id ? `Edit "${editingProfile.name}"` : "Create New Organization Profile"}
                  </h3>
                  <p className="text-xs text-gray-400">Configure comprehensive custom designs, watermarks, tags and layout fields.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="text-xs font-bold text-gray-500 hover:underline cursor-pointer"
                >
                  Cancel & Back
                </button>
              </div>

              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 border-b pb-2">
                      1. General Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Internal Name (e.g. "Mumbai HQ", "Subsidiary") <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingProfile.name}
                          onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="e.g. Pune Regional Office"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Official Organization Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingProfile.organizationName}
                          onChange={(e) => setEditingProfile({ ...editingProfile, organizationName: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="e.g. Apex Enterprise Solutions India Ltd."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Official Corporate Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={editingProfile.address}
                          onChange={(e) => setEditingProfile({ ...editingProfile, address: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="Enter complete legal registered address..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Contact number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingProfile.contactNumber}
                          onChange={(e) => setEditingProfile({ ...editingProfile, contactNumber: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="+91 22 5555 1234"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Contact Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={editingProfile.email}
                          onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="billing@apex.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Corporate Website
                        </label>
                        <input
                          type="text"
                          value={editingProfile.website}
                          onChange={(e) => setEditingProfile({ ...editingProfile, website: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="www.apex.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Authorized signatory Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingProfile.authorizedSignatory}
                          onChange={(e) => setEditingProfile({ ...editingProfile, authorizedSignatory: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="John Doe, Managing Director"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 border-b pb-2">
                      2. Design Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Header Design Style
                        </label>
                        <select
                          value={editingProfile.headerDesign}
                          onChange={(e) => setEditingProfile({ ...editingProfile, headerDesign: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                        >
                          <option value="standard">Standard Corporate (Left logo, Right Meta)</option>
                          <option value="minimal">Minimal Modern (Clean Top border)</option>
                          <option value="modern">Modern Tech (Left Logo, Right shaded container)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Footer Design Style
                        </label>
                        <select
                          value={editingProfile.footerDesign}
                          onChange={(e) => setEditingProfile({ ...editingProfile, footerDesign: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                        >
                          <option value="standard">Standard (Full signatory on right, Metadata left)</option>
                          <option value="minimal">Minimalist (Disclaimer only, bottom center)</option>
                          <option value="modern">Modern shaded (Border, signatory watermark)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Branding Footer Disclaimer
                        </label>
                        <input
                          type="text"
                          value={editingProfile.footerText}
                          onChange={(e) => setEditingProfile({ ...editingProfile, footerText: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="e.g. This document is strictly private and confidential."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 border-b pb-2">
                      3. Statutory Identifiers (GST / PAN)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          GSTIN / Tax Number
                        </label>
                        <input
                          type="text"
                          value={editingProfile.gstNumber}
                          onChange={(e) => setEditingProfile({ ...editingProfile, gstNumber: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="e.g. 27AAAAA1111A1Z1"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Permanent Account Number (PAN)
                        </label>
                        <input
                          type="text"
                          value={editingProfile.panNumber}
                          onChange={(e) => setEditingProfile({ ...editingProfile, panNumber: e.target.value })}
                          className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                          placeholder="e.g. AAAAA1111A"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Uploads Column */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 border-b pb-2 flex items-center gap-1.5">
                    <Notebook className="w-4 h-4" /> Branding Assets
                  </h4>

                  {/* LOGO */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Profile logo (Company Logo)
                    </label>
                    <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center bg-gray-50/50 dark:bg-gray-900/30">
                      {editingProfile.logo ? (
                        <div className="space-y-2">
                          <img src={editingProfile.logo} alt="mini logo" className="max-h-20 mx-auto object-contain" />
                          <button
                            type="button"
                            onClick={() => setEditingProfile({ ...editingProfile, logo: "" })}
                            className="text-[10px] text-red-500 font-bold hover:underline"
                          >
                            Remove Logo
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] text-gray-400">No logo uploaded</p>
                          <label className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer block mt-1">
                            Upload Logo (max 2MB)
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleProfileImageUpload(e, "logo")}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SIGNATURE */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Authorized Digital Signature
                    </label>
                    <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center bg-gray-50/50 dark:bg-gray-900/30">
                      {editingProfile.digitalSignature ? (
                        <div className="space-y-2">
                          <img src={editingProfile.digitalSignature} alt="mini sig" className="max-h-12 mx-auto object-contain" />
                          <button
                            type="button"
                            onClick={() => setEditingProfile({ ...editingProfile, digitalSignature: "" })}
                            className="text-[10px] text-red-500 font-bold hover:underline"
                          >
                            Remove Signature
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] text-gray-400">No signature uploaded</p>
                          <label className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer block mt-1">
                            Upload Signature (max 2MB)
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleProfileImageUpload(e, "digitalSignature")}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LETTERHEAD BACKGROUND */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Watermark Letterhead Background
                    </label>
                    <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center bg-gray-50/50 dark:bg-gray-900/30">
                      {editingProfile.letterheadBackground ? (
                        <div className="space-y-2">
                          <img src={editingProfile.letterheadBackground} alt="mini bg" className="max-h-24 mx-auto object-contain" />
                          <button
                            type="button"
                            onClick={() => setEditingProfile({ ...editingProfile, letterheadBackground: "" })}
                            className="text-[10px] text-red-500 font-bold hover:underline"
                          >
                            Remove Background
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] text-gray-400">No background watermark uploaded</p>
                          <label className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer block mt-1">
                            Upload Background (max 2MB)
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleProfileImageUpload(e, "letterheadBackground")}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE ACTION BAR */}
              <div className="p-6 md:p-8 bg-gray-50/30 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-5 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Custom iFrame-safe Confirmation Modal */}
      {deletingProfile && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-profile-modal">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <Trash className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Delete Organization Profile</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
              Are you sure you want to delete profile <strong className="text-gray-900 dark:text-white">"{deletingProfile.name}"</strong>?
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingProfile(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = deletingProfile;
                  setDeletingProfile(null);
                  handleDeleteProfile(p.id);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                id="confirm-delete-profile-btn"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
