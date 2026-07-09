/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Sparkles,
  Upload,
  History,
  Layers,
  Database,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Lock,
  User as UserIcon,
  Briefcase,
  ChevronRight,
  Users,
  Archive,
  Home,
  HelpCircle,
} from "lucide-react";
import { api } from "./lib/api";
import { User, UserRole } from "./types";

// Import sub-components
import Dashboard from "./components/Dashboard";
import TemplateUpload from "./components/TemplateUpload";
import TemplateSettings from "./components/TemplateSettings";
import CategoriesManager from "./components/CategoriesManager";
import DropdownsManager from "./components/DropdownsManager";
import DocGenerator from "./components/DocGenerator";
import DocHistory from "./components/DocHistory";
import AuditLogs from "./components/AuditLogs";
import AppSettings from "./components/AppSettings";
import UsersManager from "./components/UsersManager";
import TemplateVault from "./components/TemplateVault";
import SdgCartoonAnimation from "./components/SdgCartoonAnimation";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionValidating, setSessionValidating] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customizerBackView, setCustomizerBackView] = useState("generator");

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Login form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginDiagnostics, setLoginDiagnostics] = useState<{
    checkedUrl: string;
    healthCheckPassed: boolean;
    healthCheckError?: string;
    statusCode?: number;
    contentType?: string;
    responseText?: string;
    corsPossibleBlock?: boolean;
  } | null>(null);

  // Auth tabs & Registration form states
  const [authTab, setAuthTab] = useState<"login" | "register" | "verifyPending" | "forgotPassword" | "resetPassword">("login");
  const [regFullName, setRegFullName] = useState("");
  const [regFirmName, setRegFirmName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regAccountType, setRegAccountType] = useState("Official");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);
  const [regVerificationLink, setRegVerificationLink] = useState("");
  const [verifiedSuccessMsg, setVerifiedSuccessMsg] = useState("");

  // Forgot & Reset Password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [resetPasswordState, setResetPasswordState] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Register session expired listener globally
  useEffect(() => {
    const unsubscribe = api.onSessionExpired((errorMsg) => {
      setCurrentUser(null);
      setLoginError(errorMsg);
      setAuthTab("login");
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize theme & load persistent user sessions
  useEffect(() => {
    const token = localStorage.getItem("sdg_token");
    if (token) {
      setSessionValidating(true);
      api.getCurrentUserFromServer()
        .then((data) => {
          if (data && data.success && data.user) {
            localStorage.setItem("sdg_user", JSON.stringify(data.user));
            setCurrentUser(data.user);
            const role = String(data.user.role).toLowerCase();
            if (role === "super_admin" || role === "superadmin") {
              setActiveView("superadmin");
            } else if (role === "user" || role === "employee") {
              setActiveView("generator");
            } else {
              setActiveView("dashboard");
            }
          } else {
            api.logout();
            setCurrentUser(null);
            setLoginError("Session expired. Please login again.");
            setAuthTab("login");
          }
        })
        .catch((err) => {
          console.error("Session verification failed on startup:", err);
          api.logout();
          setCurrentUser(null);
          setLoginError("Session expired. Please login again.");
          setAuthTab("login");
        })
        .finally(() => {
          setSessionValidating(false);
        });
    } else {
      // No token on startup, clear any stale state
      api.logout();
      setCurrentUser(null);
      setSessionValidating(false);
    }

    // Parse verified status from query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      setVerifiedSuccessMsg("Your email address was verified successfully! You can now log in to your workspace.");
      setAuthTab("login");
      // Clean up the URL query parameter elegantly
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Parse recovery hash (for Supabase recovery redirect) or query param (for local)
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=") && hash.includes("type=recovery")) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      if (accessToken) {
        localStorage.setItem("supabase_recovery_token", accessToken);
        setAuthTab("resetPassword");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (params.get("reset_mode") === "local" && params.get("email")) {
      const emailParam = params.get("email");
      if (emailParam) {
        setForgotEmail(emailParam);
        localStorage.setItem("supabase_recovery_token", `local-token:${emailParam}`);
        setAuthTab("resetPassword");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Default to dark mode for rich visual feel
    const cachedTheme = localStorage.getItem("sdg_theme") || "light";
    setTheme(cachedTheme as any);
    if (cachedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setVerifiedSuccessMsg("");

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }

    setRegLoading(true);
    api.register({
      fullName: regFullName,
      firmName: regFirmName,
      email: regEmail,
      username: regUsername,
      password: regPassword,
      mobile: regMobile,
      accountType: regAccountType,
    })
      .then((res: any) => {
        setVerifiedSuccessMsg("Registration successful! You can now log in immediately.");
        setAuthTab("login");
        // Clear fields
        setRegFullName("");
        setRegFirmName("");
        setRegEmail("");
        setRegMobile("");
        setRegUsername("");
        setRegPassword("");
        setRegConfirmPassword("");
        setRegAccountType("Official");
      })
      .catch((err) => {
        setRegError(err.message || "Failed to register company.");
      })
      .finally(() => {
        setRegLoading(false);
      });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginDiagnostics(null);
    setLoginLoading(true);

    const targetApiUrl = api.getApiUrl();

    // 1. Run GET /api/health pre-flight first
    try {
      const healthResult = await api.checkHealth();
      if (!healthResult.success) {
        setLoginError(`Server connection failed. Login API could not be reached. Checked URL: ${healthResult.url}`);
        setLoginDiagnostics({
          checkedUrl: healthResult.url,
          healthCheckPassed: false,
          healthCheckError: healthResult.error || "Health check did not return success status"
        });
        setLoginLoading(false);
        return;
      }
    } catch (healthErr: any) {
      const checkedUrl = `${targetApiUrl}/api/health`;
      setLoginError(`Server connection failed. Login API could not be reached. Checked URL: ${checkedUrl}`);
      setLoginDiagnostics({
        checkedUrl,
        healthCheckPassed: false,
        healthCheckError: healthErr.message || "Failed to call pre-flight health check"
      });
      setLoginLoading(false);
      return;
    }

    // 2. Perform actual login request
    try {
      const data = await api.login(username, password);
      setCurrentUser(data.user);
      const role = String(data.user.role).toLowerCase();
      if (role === "super_admin" || role === "superadmin") {
        setActiveView("superadmin");
      } else if (role === "user" || role === "employee") {
        setActiveView("generator");
      } else {
        setActiveView("dashboard");
      }
    } catch (err: any) {
      const isFetchError = err.message.toLowerCase().includes("failed to fetch") || err.message.toLowerCase().includes("network error") || err.message.toLowerCase().includes("could not be reached");
      let displayError = err.message;
      
      if (isFetchError) {
        displayError = `Server connection failed. Login API could not be reached. Checked URL: ${targetApiUrl}/api/auth/login`;
      }
      
      setLoginError(displayError);

      // Collect safe diagnostics
      const corsBlock = isFetchError;
      setLoginDiagnostics({
        checkedUrl: `${targetApiUrl}/api/auth/login`,
        healthCheckPassed: true,
        statusCode: isFetchError ? undefined : 401,
        contentType: isFetchError ? undefined : "application/json",
        responseText: isFetchError ? "Fetch threw TypeError/Failed to fetch network error" : err.message,
        corsPossibleBlock: corsBlock
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    setRegVerificationLink("");

    api.forgotPassword(forgotEmail)
      .then((res: any) => {
        if (res.simulated && res.resetUrl) {
          setForgotSuccess("A recovery link has been simulated for your local workspace.");
          setRegVerificationLink(res.resetUrl);
        } else {
          setForgotSuccess("A secure password reset email has been sent. Please check your inbox.");
        }
      })
      .catch((err) => {
        setForgotError(err.message || "Failed to request password reset.");
      })
      .finally(() => {
        setForgotLoading(false);
      });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (resetPasswordState !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    api.resetPassword(resetPasswordState)
      .then(() => {
        setResetSuccess("Your security password has been successfully updated!");
        setTimeout(() => {
          setAuthTab("login");
          setResetSuccess("");
          setResetPasswordState("");
          setResetConfirmPassword("");
          localStorage.removeItem("supabase_recovery_token");
        }, 2500);
      })
      .catch((err) => {
        setResetError(err.message || "Failed to update security password.");
      })
      .finally(() => {
        setResetLoading(false);
      });
  };

  const handleQuickLogin = (userType: "admin" | "user") => {
    setUsername(userType === "admin" ? "mayurdivate24" : "user");
    setPassword(userType === "admin" ? "oMsairaM@4" : "user123");
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setSelectedTemplateId(null);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("sdg_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setSelectedTemplateId(null);
    setMobileMenuOpen(false);
  };

  const handleConfigureTemplate = (templateId: string, backView = "vault") => {
    setSelectedTemplateId(templateId);
    setCustomizerBackView(backView);
    setActiveView("form-customizer");
  };

  const isSuperAdminUser = currentUser !== null && (
    String(currentUser.role).toLowerCase() === "super_admin" || 
    String(currentUser.role).toLowerCase() === "superadmin"
  );
  
  const isFirmAdminUser = currentUser !== null && (
    String(currentUser.role).toLowerCase() === "firm_admin" || 
    String(currentUser.role).toLowerCase() === "admin" || 
    String(currentUser.role).toLowerCase() === "administrator"
  );

  const isAdmin = isSuperAdminUser || isFirmAdminUser;

  // Render correct sub-view
  const renderContent = () => {
    if (activeView === "form-customizer" && selectedTemplateId) {
      return (
        <TemplateSettings
          templateId={selectedTemplateId}
          onBack={() => handleNavigate(customizerBackView)}
        />
      );
    }

    switch (activeView) {
      case "superadmin":
        return <SuperAdminDashboard />;
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "vault":
        return (
          <TemplateVault
            onEditTemplate={(id) => handleConfigureTemplate(id, "vault")}
            onNavigateToUpload={() => handleNavigate("templates")}
          />
        );
      case "templates":
        return <TemplateUpload onUploadSuccess={(id) => handleConfigureTemplate(id, "vault")} />;
      case "categories":
        return <CategoriesManager />;
      case "dropdowns":
        return <DropdownsManager />;
      case "generator":
        return <DocGenerator />;
      case "history":
        return <DocHistory />;
      case "audit-logs":
        return <AuditLogs />;
      case "users":
        return <UsersManager />;
      case "settings":
        return <AppSettings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // Nav configuration
  const menuItems = isSuperAdminUser
    ? [
        { id: "superadmin", label: "Super Admin Portal", icon: ShieldCheck, adminOnly: false },
        { id: "audit-logs", label: "Global Security Log", icon: Database, adminOnly: false },
      ]
    : [
        { id: "dashboard", label: "Dashboard", icon: FileText, adminOnly: false },
        { id: "generator", label: "Generate Document", icon: Sparkles, adminOnly: false },
        { id: "history", label: "Document History", icon: History, adminOnly: false },
        { id: "vault", label: "Template Vault", icon: Archive, adminOnly: true },
        { id: "templates", label: "Upload Template", icon: Upload, adminOnly: true },
        { id: "categories", label: "Categories", icon: Layers, adminOnly: true },
        { id: "dropdowns", label: "Dropdown Master", icon: Database, adminOnly: true },
        { id: "audit-logs", label: "Security Log", icon: ShieldCheck, adminOnly: true },
        { id: "users", label: "User Management", icon: Users, adminOnly: true },
        { id: "settings", label: "System Settings", icon: Settings, adminOnly: true },
      ];

  if (sessionValidating) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}>
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          {/* Beautiful glowing modern loader spinner */}
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-950 rounded-full animate-pulse"></div>
            <div className="absolute w-16 h-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <FileText className="absolute w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">SDG Automation</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Verifying secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div id="login-root" className={`min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}>
        {/* Left Panel: Hero Graphics */}
        <div className="flex-1 bg-gradient-to-br from-blue-700 via-indigo-800 to-blue-950 flex flex-col justify-between p-8 md:p-16 text-white relative overflow-hidden select-none">
          <div className="absolute top-0 left-0 w-full h-full bg-radial from-blue-500/10 to-transparent blur-3xl pointer-events-none"></div>

          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <FileText className="w-6 h-6 text-white" />
              </span>
              SDG Automation
            </h2>
          </div>

          <div className="my-12 max-w-lg space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Enterprise Document Automation.
              </h1>
              <p className="text-sm md:text-base text-blue-100 leading-relaxed font-medium">
                Eliminate manual data entry errors. Upload Microsoft Word templates, dynamically generate input forms, and produce pixel-perfect documents instantly.
              </p>
            </div>

            {/* Cartoon Animation explaining SDG function */}
            <SdgCartoonAnimation />
          </div>

          <div className="text-xs text-blue-200/60 font-semibold">
            © 2026 Smart Document Generator. All Rights Reserved.
          </div>
        </div>

        {/* Right Panel: Auth forms */}
        <div className="flex-1 flex justify-center items-center p-8 bg-white dark:bg-gray-950 transition-colors">
          <div className="w-full max-w-md space-y-6 relative">
            {/* Dark mode switcher in login */}
            <button
              onClick={toggleTheme}
              className="absolute -top-12 md:top-0 right-0 p-2.5 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {authTab === "verifyPending" ? (
              <div className="text-center space-y-5 py-6">
                <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Verify Your Email
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    We've sent an activation link to your registered email address. Please click the link to activate your firm and log in.
                  </p>

                  {regVerificationLink ? (
                    <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-3 mt-4 text-left">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <span>🚀</span> Quick Activation Link (Local Bypass)
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        Since we are in a sandbox or local environment, you can click the button below to instantly activate your account and start testing.
                      </p>
                      <a
                        href={regVerificationLink}
                        target="_self"
                        className="inline-flex w-full justify-center items-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer text-center"
                      >
                        Activate Account Now
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg mt-4">
                      💡 <strong>Local environment note:</strong> If you're on local preview, the email verification link is printed directly inside your Node.js console logs. Locate and click it to instantly activate your account.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setAuthTab("login"); setVerifiedSuccessMsg(""); }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            ) : authTab === "forgotPassword" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
                    Enter your registered email to receive a secure password recovery link.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {forgotError && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3.5 py-2.5 rounded-xl font-semibold">
                      {forgotError}
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 font-semibold leading-relaxed">
                      ✨ {forgotSuccess}
                    </div>
                  )}

                  {regVerificationLink && (
                    <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-3 mt-4 text-left">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <span>🚀</span> Quick Recovery Link (Local Bypass)
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        Since we are in a sandbox or local environment, you can click the button below to instantly reset your password.
                      </p>
                      <a
                        href={regVerificationLink}
                        target="_self"
                        className="inline-flex w-full justify-center items-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer text-center"
                      >
                        Reset Password Now
                      </a>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition cursor-pointer"
                  >
                    {forgotLoading ? "Processing reset request..." : "Send Recovery Email"}
                  </button>
                </form>

                <button
                  onClick={() => { setAuthTab("login"); setForgotError(""); setForgotSuccess(""); setRegVerificationLink(""); }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            ) : authTab === "resetPassword" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Set New Password
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
                    Choose a strong security password for your account.
                  </p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={resetPasswordState}
                      onChange={(e) => setResetPasswordState(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {resetError && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3.5 py-2.5 rounded-xl font-semibold">
                      {resetError}
                    </div>
                  )}

                  {resetSuccess && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 font-semibold leading-relaxed">
                      ✨ {resetSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition cursor-pointer"
                  >
                    {resetLoading ? "Updating security password..." : "Confirm Password Update"}
                  </button>
                </form>

                <button
                  onClick={() => { setAuthTab("login"); setResetError(""); setResetSuccess(""); }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header title */}
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Secure Portal Access
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
                    {authTab === "login" ? "Enter your credentials to access your firm workspace." : "Create a new firm account and start automating."}
                  </p>
                </div>

                {verifiedSuccessMsg && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 font-semibold leading-relaxed">
                    ✨ {verifiedSuccessMsg}
                  </div>
                )}

                {/* Tab selector */}
                <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl">
                  <button
                    onClick={() => { setAuthTab("login"); setLoginError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      authTab === "login"
                        ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setAuthTab("register"); setRegError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      authTab === "register"
                        ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                    }`}
                  >
                    Register Firm
                  </button>
                </div>

                {/* Login Form */}
                {authTab === "login" && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Username / Email
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder="Enter username or registered email"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => { setAuthTab("forgotPassword"); setLoginError(""); setForgotEmail(""); setForgotSuccess(""); setRegVerificationLink(""); }}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <input
                          type="password"
                          required
                          placeholder="Enter security password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {loginError && (
                      <div className="space-y-3">
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3.5 py-2.5 rounded-xl font-semibold">
                          {loginError}
                        </div>
                        
                        {loginDiagnostics && (
                          <div className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-3 rounded-xl font-mono space-y-1 text-left">
                            <div className="font-bold border-b border-gray-200 dark:border-gray-800 pb-1 mb-1 text-gray-700 dark:text-gray-300">
                              🔍 CONNECTION DIAGNOSTICS:
                            </div>
                            <div><span className="font-bold text-gray-500">Checked URL:</span> <span className="break-all">{loginDiagnostics.checkedUrl}</span></div>
                            <div><span className="font-bold text-gray-500">Health Check:</span> {loginDiagnostics.healthCheckPassed ? <span className="text-green-600 font-bold">🟢 PASSED</span> : <span className="text-red-600 font-bold">🔴 FAILED</span>}</div>
                            {loginDiagnostics.healthCheckError && (
                              <div className="text-red-500"><span className="font-bold">Health Error:</span> {loginDiagnostics.healthCheckError}</div>
                            )}
                            {loginDiagnostics.statusCode !== undefined && (
                              <div><span className="font-bold text-gray-500">HTTP Status:</span> {loginDiagnostics.statusCode}</div>
                            )}
                            {loginDiagnostics.contentType && (
                              <div><span className="font-bold text-gray-500">Content-Type:</span> {loginDiagnostics.contentType}</div>
                            )}
                            {loginDiagnostics.responseText && (
                              <div className="max-h-20 overflow-y-auto bg-gray-100 dark:bg-black/40 p-1.5 rounded mt-1 text-[10px]">
                                <span className="font-bold text-gray-500">Response:</span> {loginDiagnostics.responseText.substring(0, 300)}
                              </div>
                            )}
                            {loginDiagnostics.corsPossibleBlock && (
                              <div className="text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                ⚠️ Request failed or was blocked. Please check CORS settings or if backend server is offline.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition cursor-pointer"
                    >
                      {loginLoading ? "Verifying authenticity..." : "Login to Workspace"}
                    </button>
                  </form>
                )}

                {/* Registration Form */}
                {authTab === "register" && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Firm / Company Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Acme Corp"
                          value={regFirmName}
                          onChange={(e) => setRegFirmName(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="john@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="+1234567890"
                          value={regMobile}
                          onChange={(e) => setRegMobile(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. mayur_admin"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Account Type
                        </label>
                        <select
                          required
                          value={regAccountType}
                          onChange={(e) => setRegAccountType(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Official">Official</option>
                          <option value="Personal">Personal</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {regError && (
                      <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3.5 py-2.5 rounded-xl font-semibold">
                        {regError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition cursor-pointer"
                    >
                      {regLoading ? "Creating Firm Workspace..." : "Register & Request Verification"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Collapsible Template Guide */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-900/60 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowTemplateGuide(!showTemplateGuide)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-none focus:outline-none"
              >
                <HelpCircle className="w-4 h-4 shrink-0 text-indigo-500" />
                {showTemplateGuide ? "Hide Template Formatting Guide" : "Show Template Formatting Guide"}
              </button>

              <AnimatePresence>
                {showTemplateGuide && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden w-full mt-3.5"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3.5">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Guide for Making Templates
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        To define dynamic variable fields inside your uploaded Microsoft Word (.docx) or Excel (.xlsx) templates, write placeholders in either of these syntax styles:
                      </p>
                      <div className="space-y-2 pt-0.5">
                        <div className="flex items-center justify-between text-xs p-2.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 font-mono">
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold tracking-wider">Curly Braces:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">{"{{variable_name}}"}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 font-mono">
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold tracking-wider">Angle Brackets:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">{"<<variable_name>>"}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                        Avoid punctuation or spacing inside placeholder names. On upload, our engine will automatically parse these identifiers and let you customize their display labels, input types, and list options.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}>
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Header Branding */}
        <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-900/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-black tracking-tight text-sm text-gray-800 dark:text-white truncate">
                SmartDoc Generator
              </span>
            )}
          </div>
        </div>

        {/* Navigation lists */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:text-gray-950 dark:hover:text-white"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer Collapser & User bar */}
        <div className="p-4 border-t border-gray-50 dark:border-gray-900/50 space-y-4">
          {!sidebarCollapsed && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 rounded-lg shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{currentUser.role}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-bold transition hidden md:block cursor-pointer"
            >
              {sidebarCollapsed ? "Expand" : "Collapse"}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition cursor-pointer"
              title="Logout session"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer list */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Menu drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-64 max-w-xs bg-white dark:bg-gray-950 h-full flex flex-col p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-900">
                <span className="font-black tracking-tight text-sm text-gray-800 dark:text-white">
                  SDG Automation
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
                {menuItems.map((item) => {
                  if (item.adminOnly && !isAdmin) return null;
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-gray-100 dark:border-gray-900 pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{currentUser.name}</p>
                    <p className="text-[10px] text-gray-400">{currentUser.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-xl"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header sticky */}
        <header className="sticky top-0 bg-white/75 dark:bg-gray-950/75 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/50 px-4 md:px-6 py-4 flex items-center justify-between z-40">
          {/* Desktop header left */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <span>Portal Workspace</span>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-gray-800 dark:text-white">
                {activeView === "form-customizer"
                  ? "Configure Custom Form"
                  : menuItems.find((m) => m.id === activeView)?.label || "Workspace"}
              </span>
            </div>
          </div>

          {/* Mobile Header elements */}
          <div className="flex md:hidden items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-gray-500 cursor-pointer"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-1.5 font-black text-gray-900 dark:text-white text-sm tracking-tight">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>SDG</span>
              </div>
            </div>
            
            <div className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">
              {activeView === "dashboard" && "Dashboard"}
              {activeView === "generator" && "Generate"}
              {activeView === "vault" && "Templates"}
              {activeView === "history" && "History"}
              {activeView === "settings" && "Settings"}
              {!["dashboard", "generator", "vault", "history", "settings"].includes(activeView) && (menuItems.find((m) => m.id === activeView)?.label || "SDG")}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleTheme}
                className="p-1.5 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <div className="w-7 h-7 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full font-black text-[10px] flex items-center justify-center select-none">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Desktop header right */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              title="Toggle Dark/Light Mode"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User credentials chip */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100 dark:border-gray-900">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-extrabold text-gray-800 dark:text-white leading-none">{currentUser.name}</p>
                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mt-1 inline-block">
                  {currentUser.role}
                </span>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full font-black text-xs select-none">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* View content panel */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/80 px-4 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => handleNavigate("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
            activeView === "dashboard" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => handleNavigate("generator")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
            activeView === "generator" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span>Generate</span>
        </button>
        <button
          onClick={() => handleNavigate("vault")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
            activeView === "vault" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>Templates</span>
        </button>
        <button
          onClick={() => handleNavigate("history")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
            activeView === "history" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </button>
        <button
          onClick={() => handleNavigate("settings")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
            activeView === "settings" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Floating Action Button for Document Generation */}
      {currentUser && activeView !== "generator" && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleNavigate("generator")}
          className="fixed bottom-6 right-6 z-50 hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3.5 rounded-full shadow-xl shadow-indigo-600/30 dark:shadow-indigo-900/40 transition-colors border border-indigo-500/30 cursor-pointer text-xs uppercase tracking-wider"
          id="floating-generate-btn"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Generate Document</span>
        </motion.button>
      )}
    </div>
  );
}
