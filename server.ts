/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import child_process from "child_process";
import { Database, isSupabaseEnabled, supabase, ensureDbConnected } from "./server/db";
import { UserRole, InputType } from "./src/types";
import { resolveLibreOfficePath, convertOfficeToPdf, getLibreOfficeVersion } from "./server/lib/libreoffice";
import { sendVerificationEmail } from "./server/lib/email";
import { createClient } from "@supabase/supabase-js";


const app = express();
const PORT = 3000;

// Body parsing middlewares (with increased payload size limits for base64 logos & signatures)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS Setup
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1",
  "https://smart-document-generator-rose.vercel.app",
  "https://smart-document-generator-ewvw.onrender.com",
  "capacitor://localhost",
  "ionic://localhost",
  "http://10.0.2.2:3000", // Android Emulator Loopback
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps (no origin) or capacitor/ionic schemas or local / preview environments
      if (!origin) {
        return callback(null, true);
      }
      
      const isAllowed = allowedOrigins.some(o => origin === o || origin.startsWith(o)) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("google.com") ||
        origin.includes("googleusercontent.com") ||
        origin.includes("run.app") || // AI Studio previews
        origin.startsWith("capacitor://") ||
        origin.startsWith("ionic://");

      if (isAllowed) {
        callback(null, true);
      } else {
        // Fallback for previews/robustness
        callback(null, true);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  })
);

// Auto-detect and heal DB connection before handling API routes
app.use(async (req, res, next) => {
  try {
    await ensureDbConnected();
  } catch (err) {
    console.warn("DB self-healing check error:", err);
  }
  next();
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".docx" || ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new Error("Only Microsoft Word (.docx) and Excel (.xlsx, .xls) files are allowed."));
    }
  },
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Authentication Middleware
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  let authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  } else if (req.query.authorization && typeof req.query.authorization === "string") {
    token = req.query.authorization;
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  try {
    const users = await Database.getUsers();
    const foundUser = users.find((u) => u.id === token); // Token is the user ID in our system

    if (!foundUser) {
      return res.status(401).json({ error: "Invalid token. Please login again." });
    }

    (req as any).user = foundUser;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication system error." });
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(403).json({ error: "Forbidden. Access token required." });
  }
  const role = String(user.role).toLowerCase();
  if (role !== "firm_admin" && role !== "super_admin" && role !== "admin" && role !== "administrator" && role !== "superadmin") {
    return res.status(403).json({ error: "Forbidden. Admin role required." });
  }
  next();
}

function isSuperAdmin(user: any): boolean {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase();
  return role === "super_admin" || role === "superadmin";
}

function isFirmAdmin(user: any): boolean {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase();
  return role === "firm_admin" || role === "admin" || role === "administrator";
}

// Helper to infer placeholder configuration from name
function inferPlaceholderConfig(placeholder: string, order: number) {
  const label = placeholder
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let inputType = "text";
  const lower = placeholder.toLowerCase();

  if (lower.includes("date")) {
    inputType = "date";
  } else if (lower.includes("email")) {
    inputType = "email";
  } else if (lower.includes("mobile") || lower.includes("phone")) {
    inputType = "phone";
  } else if (
    lower.includes("address") ||
    lower.includes("description") ||
    lower.includes("remarks")
  ) {
    inputType = "textarea";
  } else if (
    lower.includes("amount") ||
    lower.includes("percentage") ||
    lower.includes("price") ||
    lower.includes("rate") ||
    lower.includes("cost") ||
    lower.includes("plot_area")
  ) {
    inputType = "decimal";
  } else if (lower.includes("quantity")) {
    inputType = "number";
  }

  return {
    placeholder,
    label,
    inputType: inputType as InputType,
    required: true,
    defaultValue: "",
    helpText: `Please enter ${label.toLowerCase()}`,
    validationRegex: "",
    placeholderText: `Enter ${label.toLowerCase()}`,
    grouping: "General Information",
    displayOrder: order,
    hideField: false,
    readOnly: false,
  };
}

// --- API ROUTES ---

// 1. Authentication
app.get("/api/auth/me", async (req, res) => {
  let authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  } else if (req.query.authorization && typeof req.query.authorization === "string") {
    token = req.query.authorization;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const users = await Database.getUsers();
    const foundUser = users.find((u) => u.id === token);

    if (!foundUser) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    return res.json({
      success: true,
      user: foundUser
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.status(500).json({ success: false, error: "Authentication system error." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const lowerInput = username.trim().toLowerCase();

    // 1. Fetch user by username or email
    let user = await Database.getUserByUsername(lowerInput);
    if (!user) {
      const allUsers = await Database.getUsers();
      user = allUsers.find(
        (u) =>
          u.username.toLowerCase() === lowerInput ||
          u.email.toLowerCase() === lowerInput
      );
    }

    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: "Invalid username/email or password." });
    }

    // Auto-verify as verification is bypassed
    if (user.isVerified === false) {
      await Database.updateUser(user.id, { isVerified: true, verificationToken: null });
      user.isVerified = true;
    }

    // Check if organization is disabled
    if (user.firmId) {
      const firm = await Database.getFirm(user.firmId);
      if (firm) {
        if (firm.status === "disabled") {
          return res.status(403).json({ error: "Your organization workspace has been disabled by a system administrator." });
        }
        if (!firm.isVerified) {
          await Database.updateFirm(firm.id, { isVerified: true, status: "active" });
        }
      }
    }

    // Check if regular user account itself is inactive
    if (user.isActive === false) {
      return res.status(403).json({ error: "Your user account is currently set to inactive. Please contact your administrator." });
    }

    // Create Audit Log
    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "LOGIN",
      details: `${user.name} logged in successfully`,
      firmId: user.firmId,
    });

    return res.json({
      token: user.id,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        firmId: user.firmId,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Login endpoint exception:", err);
    res.status(500).json({ error: err.message || "Login failure" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, firmName, email, username, password, mobile, accountType } = req.body;
    
    if (!name || !firmName || !email || !username || !password || !mobile) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const lowerEmail = email.trim().toLowerCase();
    const lowerUsername = username.trim().toLowerCase();

    // Check if user already exists
    const existingByUsername = await Database.getUserByUsername(lowerUsername);
    if (existingByUsername) {
      return res.status(400).json({ error: "A user with this username already exists." });
    }

    const allUsers = await Database.getUsers();
    const existingByEmail = allUsers.find(u => u.email.toLowerCase() === lowerEmail);
    if (existingByEmail) {
      return res.status(400).json({ error: "A user with this email address already exists." });
    }

    const firmId = "firm-" + Math.random().toString(36).substring(2, 9);
    
    // Create the Firm
    const newFirm = {
      id: firmId,
      name: firmName.trim(),
      email: lowerEmail,
      mobile: mobile.trim(),
      plan: "free_trial" as const,
      status: "active" as const, // Instant activation!
      isVerified: true, // Instant verification!
      verificationToken: null,
      accountType: accountType || "Official",
      createdAt: new Date().toISOString(),
    };
    await Database.createFirm(newFirm as any);

    // Create the User (Firm Admin)
    const userId = "user-" + Math.random().toString(36).substring(2, 9);
    const newUser = {
      id: userId,
      username: lowerUsername,
      name: name.trim(),
      email: lowerEmail,
      role: UserRole.FIRM_ADMIN, // Mapped to 'firm_admin'
      firmId: firmId,
      createdAt: new Date().toISOString(),
      passwordHash: password,
      isVerified: true, // Instant activation!
      verificationToken: null,
      mobile: mobile.trim(),
      isActive: true,
    };
    await Database.createUser(newUser);

    // Create firm profile and settings
    await Database.seedFirmData(firmId, firmName.trim());

    // Create initial audit log
    await Database.createAuditLog({
      userId: userId,
      userName: name.trim(),
      userEmail: lowerEmail,
      role: UserRole.FIRM_ADMIN,
      action: "REGISTER",
      details: `Registered firm ${firmName.trim()} with administrator account`,
      firmId: firmId,
    });

    return res.json({
      success: true,
      message: "Registration successful! You can now login immediately with your username or email.",
    });

  } catch (err: any) {
    console.error("Registration endpoint exception:", err);
    res.status(500).json({ error: err.message || "Registration failure" });
  }
});

app.get("/api/auth/verify", async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).send("<h3>Missing token or email parameter.</h3>");
    }

    const users = await Database.getUsers();
    const user = users.find((u) => u.username.toLowerCase() === (email as string).toLowerCase().trim());
    if (!user) {
      return res.status(404).send("<h3>User not found.</h3>");
    }

    if (user.verificationToken !== token) {
      return res.status(400).send("<h3>Invalid or expired verification token.</h3>");
    }

    // Update user verification
    await Database.updateUser(user.id, {
      isVerified: true,
      verificationToken: null,
    });

    // Update firm verification if user had a firm
    if (user.firmId) {
      await Database.updateFirm(user.firmId, {
        isVerified: true,
        status: "active",
        verificationToken: null,
      });
      // Seed the firm data
      const firm = await Database.getFirm(user.firmId);
      if (firm) {
        await Database.seedFirmData(firm.id, firm.name);
      }
    }

    // Log audit
    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "EMAIL_VERIFICATION",
      details: `User email verified successfully`,
      firmId: user.firmId,
    });

    res.send(`
      <html>
        <head>
          <title>Verification Successful</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f3f4f6; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h2 { color: #10b981; }
            a { display: inline-block; margin-top: 1.5rem; background: #3b82f6; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: 500; }
            a:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Email Verified Successfully!</h2>
            <p>Your account is now active and ready to use. You can close this window or click below to log in.</p>
            <a href="/login?verified=true" id="login-link">Go to Login</a>
          </div>
          <script>
            setTimeout(() => {
              if (window.parent && window.parent !== window) {
                window.parent.location.href = "/login?verified=true";
              } else {
                window.location.href = "/login?verified=true";
              }
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Verification error:", err);
    res.status(500).send(`<h3>Verification failure: ${err.message}</h3>`);
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const lowerEmail = email.trim().toLowerCase();

    if (isSupabaseEnabled && supabase) {
      const host = req.get("host") || "localhost:3000";
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(lowerEmail, {
        redirectTo: `${baseUrl}`,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        success: true,
        message: "Password reset link sent successfully via Supabase Auth."
      });
    } else {
      // Local simulation
      const user = await Database.getUserByUsername(lowerEmail);
      if (!user) {
        return res.status(404).json({ error: "User with this email not found." });
      }

      const host = req.get("host") || "localhost:3000";
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/?reset_mode=local&email=${encodeURIComponent(user.email)}`;

      return res.json({
        success: true,
        simulated: true,
        resetUrl,
        message: "Password reset link generated successfully for local simulation."
      });
    }
  } catch (err: any) {
    console.error("Forgot password endpoint exception:", err);
    res.status(500).json({ error: err.message || "Forgot password failure" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "New password is required." });
    }

    let authHeader = req.headers.authorization;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(400).json({ error: "Reset token or recovery authorization token is missing." });
    }

    if (isSupabaseEnabled && supabase && !token.startsWith("local-token:")) {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      if (updateData?.user) {
        // Sync the password locally
        const dbUsers = await Database.getUsers();
        const dbUser = dbUsers.find((u) => u.id === updateData.user.id);
        if (dbUser) {
          await Database.updateUser(dbUser.id, { passwordHash: password });
        }
      }

      return res.json({ success: true, message: "Password updated successfully via Supabase Auth!" });
    } else {
      // Local fallback password reset using the token "local-token:email@example.com"
      if (!token.startsWith("local-token:")) {
        return res.status(400).json({ error: "Invalid password reset token." });
      }

      const email = token.substring("local-token:".length);
      const user = await Database.getUserByUsername(email);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      await Database.updateUser(user.id, { passwordHash: password });

      return res.json({ success: true, message: "Password updated successfully in local workspace!" });
    }
  } catch (err: any) {
    console.error("Reset password endpoint exception:", err);
    res.status(500).json({ error: err.message || "Reset password failure" });
  }
});

app.post("/api/auth/logout", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    
    if (isSupabaseEnabled && supabase) {
      await supabase.auth.signOut();
    }

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "LOGOUT",
      details: `${user.name} logged out successfully`,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Logout failure" });
  }
});

// Helper to get firmId from request user (or undefined for SuperAdmin)
function getFirmId(req: express.Request): string | undefined {
  const user = (req as any).user;
  if (!user) return undefined;
  const r = String(user.role).toLowerCase();
  return (r === "superadmin" || r === "super_admin") ? undefined : user.firmId;
}

// 2. Dashboard Stats
app.get("/api/dashboard/stats", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    const templates = await Database.getTemplates(firmId);
    const docs = await Database.getDocuments(firmId);

    const todayStr = new Date().toISOString().split("T")[0];
    const thisMonthStr = new Date().toISOString().substring(0, 7);

    const getIsoString = (val: any): string => {
      if (!val) return "";
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? "" : d.toISOString();
      } catch {
        return "";
      }
    };

    const generatedToday = docs.filter((d) => {
      if (!d || !d.createdAt) return false;
      const dateStr = getIsoString(d.createdAt);
      return dateStr && dateStr.startsWith(todayStr);
    }).length;

    const generatedThisMonth = docs.filter((d) => {
      if (!d || !d.createdAt) return false;
      const dateStr = getIsoString(d.createdAt);
      return dateStr && dateStr.startsWith(thisMonthStr);
    }).length;

    res.json({
      totalTemplates: templates.length,
      generatedToday,
      generatedThisMonth,
      recentDocuments: docs.slice(0, 5),
      recentTemplates: templates.slice(0, 5),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Stats failure" });
  }
});

// 2.5. User Management (Admin Only)
app.get("/api/admin/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getUsers(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get users failure" });
  }
});

app.post("/api/admin/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, name, email, role, password, passwordHash, mobile, designation, isActive } = req.body;
    if (!username || !name || !email || !role) {
      return res.status(400).json({ error: "All fields (username, name, email, role) are required." });
    }
    const existing = await Database.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "Username already exists." });
    }

    const admin = (req as any).user;
    const firmId = admin.firmId;

    // Password generation fallback if none specified
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let autogenPassword = "SDG";
    for (let i = 0; i < 6; i++) {
      autogenPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const finalPassword = password || passwordHash || autogenPassword;

    const newUser = {
      id: "user-" + Math.random().toString(36).substring(2, 9),
      username: username.trim().toLowerCase(),
      name: name.trim(),
      email: email.trim(),
      role,
      firmId,
      isVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: finalPassword,
      mobile: mobile ? mobile.trim() : undefined,
      designation: designation ? designation.trim() : undefined,
      isActive: isActive !== undefined ? !!isActive : true,
    };

    await Database.createUser(newUser);

    // Audit Log
    await Database.createAuditLog({
      userId: admin.id,
      userName: admin.name,
      userEmail: admin.email,
      role: admin.role,
      action: "CREATE_USER",
      details: `Created new user ${newUser.username} (${newUser.name}) with designation "${designation || 'None'}"`,
      firmId,
    });

    res.json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Create user failure" });
  }
});

app.put("/api/admin/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email, role, password, passwordHash, mobile, designation, isActive } = req.body;

    const admin = (req as any).user;
    const firmId = getFirmId(req);

    const users = await Database.getUsers(firmId);
    const userToEdit = users.find((u) => u.id === id);
    if (!userToEdit) {
      return res.status(404).json({ error: "User not found." });
    }

    // Guard: Prevent downgrading the primary admin
    if (id === "user-admin" && role && role !== UserRole.FIRM_ADMIN && role !== "Administrator" && role !== "admin") {
      return res.status(400).json({ error: "Primary administrator role cannot be downgraded." });
    }

    if (username && username.trim().toLowerCase() !== userToEdit.username.toLowerCase()) {
      const existing = await Database.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists." });
      }
    }

    const updatedData: any = {};
    if (username !== undefined) updatedData.username = username.trim().toLowerCase();
    if (name !== undefined) updatedData.name = name.trim();
    if (email !== undefined) updatedData.email = email.trim();
    if (role !== undefined) updatedData.role = role;
    if (password !== undefined) updatedData.passwordHash = password.trim();
    else if (passwordHash !== undefined) updatedData.passwordHash = passwordHash.trim();
    if (mobile !== undefined) updatedData.mobile = mobile ? mobile.trim() : null;
    if (designation !== undefined) updatedData.designation = designation ? designation.trim() : null;
    if (isActive !== undefined) updatedData.isActive = !!isActive;

    const updatedUser = await Database.updateUser(id, updatedData);

    await Database.createAuditLog({
      userId: admin.id,
      userName: admin.name,
      userEmail: admin.email,
      role: admin.role,
      action: "MODIFY_USER",
      details: `Modified user details for ${userToEdit.username}`,
      firmId,
    });

    res.json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Modify user failure" });
  }
});

app.delete("/api/admin/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).user;
    const firmId = getFirmId(req);

    if (id === admin.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    if (id === "user-admin") {
      return res.status(400).json({ error: "Primary administrator account cannot be deleted." });
    }

    const users = await Database.getUsers(firmId);
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    const success = await Database.deleteUser(id);
    if (success) {
      await Database.createAuditLog({
        userId: admin.id,
        userName: admin.name,
        userEmail: admin.email,
        role: admin.role,
        action: "DELETE_USER",
        details: `Deleted user: ${userToDelete.username} (${userToDelete.name})`,
        firmId,
      });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete user." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Delete user failure" });
  }
});

// 3. Categories
app.get("/api/categories", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getCategories(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get categories failure" });
  }
});

app.post("/api/categories", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }

    const user = (req as any).user;
    const firmId = user.firmId;

    const category = await Database.createCategory({
      id: "cat-" + Math.random().toString(36).substring(2, 9),
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
      firmId,
    });

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "CREATE_CATEGORY",
      details: `Created template category: ${name}`,
      firmId,
    });

    res.json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Create category failure" });
  }
});

app.delete("/api/categories/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const categories = await Database.getCategories(firmId);
    const category = categories.find((c) => c.id === id);

    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    const success = await Database.deleteCategory(id);
    if (success) {
      const user = (req as any).user;
      await Database.createAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        action: "DELETE_CATEGORY",
        details: `Deleted category: ${category.name}`,
        firmId,
      });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete category." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Delete category failure" });
  }
});

// 4. Dropdown Master Data
app.get("/api/dropdowns", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getDropdowns(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get dropdowns failure" });
  }
});

app.post("/api/dropdowns", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, options } = req.body;
    if (!name || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "Name and options array are required." });
    }

    const user = (req as any).user;
    const firmId = user.firmId;

    const dropdown = await Database.createDropdown({
      id: "dd-" + Math.random().toString(36).substring(2, 9),
      name,
      options: options.map((opt) => opt.trim()),
      createdAt: new Date().toISOString(),
      firmId,
    });

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "CREATE_DROPDOWN",
      details: `Created master dropdown: ${name}`,
      firmId,
    });

    res.json(dropdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Create dropdown failure" });
  }
});

app.put("/api/dropdowns/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, options } = req.body;

    if (!name || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "Name and options array are required." });
    }

    const user = (req as any).user;
    const firmId = getFirmId(req);
    const dropdowns = await Database.getDropdowns(firmId);
    const dropdown = dropdowns.find((d) => d.id === id);
    if (!dropdown) {
      return res.status(404).json({ error: "Dropdown not found." });
    }

    const updated = await Database.updateDropdown(id, name, options);

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "EDIT_DROPDOWN",
      details: `Modified dropdown Master Data: ${name}`,
      firmId,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Edit dropdown failure" });
  }
});

app.delete("/api/dropdowns/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const dropdowns = await Database.getDropdowns(firmId);
    const dropdown = dropdowns.find((d) => d.id === id);

    if (!dropdown) {
      return res.status(404).json({ error: "Dropdown not found." });
    }

    const success = await Database.deleteDropdown(id);
    if (success) {
      const user = (req as any).user;
      await Database.createAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        action: "DELETE_DROPDOWN",
        details: `Deleted dropdown Master Data: ${dropdown.name}`,
        firmId,
      });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete dropdown." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Delete dropdown failure" });
  }
});

// 5. Templates
app.get("/api/templates", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    const user = (req as any).user;
    const allTemplates = await Database.getTemplates(firmId);

    // Super Admin and Firm Admin can see all templates of their firm
    if (isSuperAdmin(user) || isFirmAdmin(user)) {
      const templatesWithCount: any[] = [];
      for (const t of allTemplates) {
        const access = await Database.getTemplateUserAccess(t.id);
        templatesWithCount.push({
          ...t,
          assignedUserCount: access.length,
        });
      }
      return res.json(templatesWithCount);
    }

    // Normal employees / users can only see templates they have access to
    const filteredTemplates: any[] = [];
    for (const t of allTemplates) {
      if (await Database.hasTemplateAccess(t.id, user.id, user.role, user.firmId)) {
        const access = await Database.getTemplateUserAccess(t.id);
        filteredTemplates.push({
          ...t,
          assignedUserCount: access.length,
        });
      }
    }
    res.json(filteredTemplates);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get templates failure" });
  }
});

app.get("/api/templates/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const template = await Database.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }
    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && template.firmId && template.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get template failure" });
  }
});

// Multer single file upload + dynamic placeholder scanner
app.post(
  "/api/templates/upload",
  authenticate,
  requireAdmin,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(400).json({
          success: false,
          error: `Template upload failed: ${err.message}`
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const file = files.find((f) => f.fieldname === "file" || f.fieldname === "templateFile");

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "Template upload failed: No Word (.docx) or Excel (.xlsx, .xls) file was uploaded."
        });
      }

      const { name, categoryId, description, brandingMode = "built-in", assignedUserIds } = req.body;
      if (!name || !categoryId) {
        return res.status(400).json({
          success: false,
          error: "Template upload failed: Template name and category categoryId are required."
        });
      }

      const fileBuffer = file.buffer;
      const originalExt = path.extname(file.originalname).toLowerCase();
      const isExcel = originalExt === ".xlsx" || originalExt === ".xls";

      let rawText = "";
      if (isExcel) {
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (worksheet) {
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            rawText += " " + csv;
          }
        }
      } else {
        // Convert docx buffer to raw text via Mammoth to extract placeholders
        const rawTextResult = await mammoth.extractRawText({ buffer: fileBuffer });
        rawText = rawTextResult.value;
      }

      // Matches placeholders like {{client_name}} or <<client_name>>
      const placeholderRegex = /\{\{([^}]+)\}\}|<<([^>]+)>>/g;
      const matches = rawText.match(placeholderRegex) || [];

      // Filter, sanitize and de-duplicate placeholders
      const uniquePlaceholders = Array.from(
          new Set(
              matches.map((m) =>
                  m
                      .replace(/\{\{/g, "")
                      .replace(/\}\}/g, "")
                      .replace(/<</g, "")
                      .replace(/>>/g, "")
                      .trim()
              )
          )
      );

      // Map detected placeholders to automatic configuration objects
      const placeholdersConfig = uniquePlaceholders.map((p, index) =>
        inferPlaceholderConfig(p, index + 1)
      );

      const user = (req as any).user;
      const firmId = user.firmId;
      const templateId = "tpl-" + Math.random().toString(36).substring(2, 9);
      const filePath = await Database.saveTemplateFile(templateId, fileBuffer, originalExt);

      const newTemplate = await Database.createTemplate({
        id: templateId,
        name,
        description: description || "",
        categoryId,
        filePath,
        placeholders: placeholdersConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        brandingMode,
        firmId,
      });

      let userIds: string[] = [];
      if (assignedUserIds) {
        try {
          if (Array.isArray(assignedUserIds)) {
            userIds = assignedUserIds;
          } else {
            userIds = JSON.parse(assignedUserIds);
          }
        } catch {
          if (typeof assignedUserIds === "string") {
            userIds = assignedUserIds.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }
      if (userIds.length > 0) {
        await Database.setTemplateUserAccess(templateId, firmId || "firm-default", userIds, user.id);
      }

      await Database.createAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        action: "UPLOAD_TEMPLATE",
        details: `Uploaded ${isExcel ? "Excel" : "Word"} template: ${name} (${uniquePlaceholders.length} placeholders)`,
        firmId,
      });

      res.json(newTemplate);
    } catch (err: any) {
      console.error("Template processing error:", err);
      res.status(500).json({
        success: false,
        error: `Template upload failed: ${err.message || "An error occurred while parsing the template document."}`
      });
    }
  }
);

// Update customized placeholder field mappings
app.put("/api/templates/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, description, placeholders, isArchived, brandingMode, assignedUserIds } = req.body;

    const user = (req as any).user;
    const firmId = getFirmId(req);

    const originalTemplate = await Database.getTemplate(id);
    if (!originalTemplate) {
      return res.status(404).json({ error: "Template not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && originalTemplate.firmId && originalTemplate.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }

    const updated = await Database.updateTemplate(id, {
      name,
      categoryId,
      description,
      placeholders,
      isArchived,
      brandingMode,
    });

    if (assignedUserIds) {
      let userIds: string[] = [];
      if (Array.isArray(assignedUserIds)) {
        userIds = assignedUserIds;
      } else if (typeof assignedUserIds === "string") {
        try {
          userIds = JSON.parse(assignedUserIds);
        } catch {
          userIds = assignedUserIds.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
      await Database.setTemplateUserAccess(id, firmId || originalTemplate.firmId || "firm-default", userIds, user.id);
    }

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "EDIT_TEMPLATE",
      details: `Updated template configurations: ${name || originalTemplate.name}`,
      firmId,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Edit template failure" });
  }
});

// Delete template
app.delete("/api/templates/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const firmId = getFirmId(req);

    const template = await Database.getTemplate(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && template.firmId && template.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }

    const success = await Database.deleteTemplate(id);
    if (success) {
      await Database.createAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        action: "DELETE_TEMPLATE",
        details: `Deleted document template: ${template.name}`,
        firmId,
      });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete template from database." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Delete template failure" });
  }
});

// GET template user access mappings
app.get("/api/templates/:id/access", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const template = await Database.getTemplate(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }
    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && template.firmId && template.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }
    const access = await Database.getTemplateUserAccess(id);
    res.json(access);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get template access failure" });
  }
});

// POST update template user access mappings
app.post("/api/templates/:id/access", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const user = (req as any).user;
    const template = await Database.getTemplate(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }
    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && template.firmId && template.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }
    const firmId = template.firmId || user.firmId || "firm-default";
    await Database.setTemplateUserAccess(id, firmId, userIds || [], user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Set template access failure" });
  }
});

// Download original uploaded DOCX template
app.get("/api/templates/:id/download-original", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const template = await Database.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Original template file not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && template.firmId && template.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }

    const ext = path.extname(template.filePath).toLowerCase() || ".docx";
    res.setHeader("Content-Disposition", `attachment; filename="${template.name}_Template${ext}"`);

    if (template.filePath.startsWith("supabase://")) {
      const buffer = await Database.getTemplateFile(template.id, template.filePath);
      res.setHeader(
        "Content-Type",
        ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(buffer);
    } else {
      if (!fs.existsSync(template.filePath)) {
        return res.status(404).json({ error: "Original template file not found." });
      }
      return res.sendFile(template.filePath);
    }
  } catch (err: any) {
    console.error("Download original template error:", err);
    res.status(500).json({ error: err.message || "Failed to download original template." });
  }
});

// 6. Document Generation Engine
app.post("/api/documents/generate", authenticate, async (req, res) => {
  try {
    const { templateId, values, brandingOption = "none", organizationProfileId } = req.body;
    if (!templateId || !values) {
      return res.status(400).json({ error: "Template ID and placeholder values are required." });
    }

    const user = (req as any).user;
    const firmId = user.firmId;

    const template = await Database.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: "Associated template not found." });
    }

    // Verify multi-tenancy access to template
    if (!isSuperAdmin(user) && template.firmId && template.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to template." });
    }

    // Verify template-level user access control
    const hasAccess = await Database.hasTemplateAccess(templateId, user.id, user.role, user.firmId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "You do not have access to generate documents from this template."
      });
    }

    const categories = await Database.getCategories(firmId);
    const category = categories.find((c) => c.id === template.categoryId);

    // Load template content buffer from local/supabase
    const templateContent = await Database.getTemplateFile(templateId, template.filePath);
    const originalExt = path.extname(template.filePath).toLowerCase();
    const isExcel = originalExt === ".xlsx" || originalExt === ".xls";

    const docId = "doc-" + Math.random().toString(36).substring(2, 9);
    const docxFileName = `${docId}${originalExt}`;
    const pdfFileName = `${docId}.pdf`;

    // Local temporary generation path
    const localDocxPath = path.join(Database.GENERATED_DIR, docxFileName);
    const localPdfPath = path.join(Database.GENERATED_DIR, pdfFileName);

    // Augment placeholders with selected organization profile if applicable
    let finalValues = { ...values };
    let selectedProfile: any = null;

    if (brandingOption === "profile" && organizationProfileId) {
      selectedProfile = await Database.getOrganizationProfile(organizationProfileId);
      if (selectedProfile) {
        finalValues = {
          org_name: selectedProfile.organizationName,
          org_address: selectedProfile.address,
          org_contact: selectedProfile.contactNumber,
          org_email: selectedProfile.email,
          org_website: selectedProfile.website,
          org_gst: selectedProfile.gstNumber,
          org_pan: selectedProfile.panNumber,
          org_signatory: selectedProfile.authorizedSignatory,
          org_footer: selectedProfile.footerText,
          ...finalValues,
        };
      }
    }

    // Convert date strings in YYYY-MM-DD format to DD-MM-YYYY format for compiling
    for (const key of Object.keys(finalValues)) {
      const val = finalValues[key];
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [year, month, day] = val.split("-");
        finalValues[key] = `${day}-${month}-${year}`;
      }
    }

    let outputBuffer: Buffer;

    if (isExcel) {
      // Parse with XLSX
      const workbook = XLSX.read(templateContent, { type: "buffer" });
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        for (const cellKey of Object.keys(worksheet)) {
          if (cellKey.startsWith("!")) continue;
          const cell = worksheet[cellKey];
          if (cell && cell.v && typeof cell.v === "string") {
            let valStr = cell.v;
            let replaced = false;
            for (const [key, val] of Object.entries(finalValues)) {
              const p1 = `{{${key}}}`;
              const p2 = `<<${key}>>`;
              if (valStr.includes(p1)) {
                valStr = valStr.split(p1).join(String(val ?? ""));
                replaced = true;
              }
              if (valStr.includes(p2)) {
                valStr = valStr.split(p2).join(String(val ?? ""));
                replaced = true;
              }
            }
            if (replaced) {
              cell.v = valStr;
              if (cell.w) delete cell.w;
              cell.t = "s";
            }
          }
        }
      }

      outputBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    } else {
      // Word document generation
      const zip = new PizZip(templateContent);
      const systemSettings = await Database.getSettings(firmId);
      const syntax = systemSettings.placeholderSyntax || "all";

      const delimiterPairs: { start: string; end: string }[] = [];
      if (syntax === "all" || syntax === "double_brace") {
        delimiterPairs.push({ start: "{{", end: "}}" });
      }
      if (syntax === "all" || syntax === "angle_bracket") {
        delimiterPairs.push({ start: "<<", end: ">>" });
      }
      if (syntax === "all" || syntax === "double_bracket") {
        delimiterPairs.push({ start: "[[", end: "]]" });
      }
      if (syntax === "all" || syntax === "dollar_brace") {
        delimiterPairs.push({ start: "${", end: "}" });
      }

      for (const pair of delimiterPairs) {
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: pair,
        });
        doc.render(finalValues);
      }

      outputBuffer = zip.generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
    }

    // Write file locally temporarily
    fs.writeFileSync(localDocxPath, outputBuffer);
    console.log(`DOCX generated at: ${localDocxPath}`);

    // Convert to PDF locally using LibreOffice helper
    let hasGeneratedPdf = false;
    let pdfGenerationErrorMessage = "";
    try {
      console.log(`Converting ${localDocxPath} to PDF via LibreOffice helper...`);
      await convertOfficeToPdf(localDocxPath, Database.GENERATED_DIR);
      hasGeneratedPdf = true;
      console.log("PDF generation success!");
    } catch (pdfErr: any) {
      pdfGenerationErrorMessage = pdfErr.message || String(pdfErr);
      console.error("LibreOffice headless PDF conversion failed:", pdfGenerationErrorMessage);
      
      // Log technical details in the audit logs for administrators
      const auditUser = (req as any).user || { id: "unknown", name: "System", email: "system@local", role: UserRole.FIRM_ADMIN };
      try {
        await Database.createAuditLog({
          userId: auditUser.id,
          userName: auditUser.name,
          userEmail: auditUser.email,
          role: auditUser.role,
          action: "PDF_GENERATION_FAILED",
          details: JSON.stringify({
            platform: process.platform,
            libreOfficePathAttempted: process.env.LIBREOFFICE_PATH || "Search standard paths",
            inputDocxPath: localDocxPath,
            outputDirectory: Database.GENERATED_DIR,
            errorMessage: pdfGenerationErrorMessage,
            exitCode: pdfErr.status || pdfErr.code || "unknown",
          }, null, 2),
          firmId,
        });
      } catch (logErr) {
        console.error("Failed to write PDF_GENERATION_FAILED audit log:", logErr);
      }
    }

    // Upload files to Supabase Storage or keep locally, then clean up temp paths
    let savedDocxPath = localDocxPath;
    let savedPdfPath = hasGeneratedPdf ? localPdfPath : undefined;

    if (Database.isSupabaseEnabled) {
      const docxBuffer = fs.readFileSync(localDocxPath);
      const pdfBuffer = hasGeneratedPdf ? fs.readFileSync(localPdfPath) : null;

      const storagePaths = await Database.saveGeneratedDocumentFiles(docId, docxBuffer, pdfBuffer, originalExt);
      savedDocxPath = storagePaths.docxPath;
      savedPdfPath = storagePaths.pdfPath;

      // Clean up local temp files immediately
      try {
        fs.unlinkSync(localDocxPath);
        if (hasGeneratedPdf) fs.unlinkSync(localPdfPath);
      } catch (cleanupErr) {
        console.error("Error cleaning up temporary server files:", cleanupErr);
      }
    }

    const documentNumber = await Database.getNextDocumentNumber();

    const newDoc = await Database.createDocument({
      id: docId,
      documentNumber,
      templateId,
      templateName: template.name,
      categoryId: template.categoryId,
      categoryName: category ? category.name : "Uncategorized",
      generatedBy: {
        userId: user.id,
        name: user.name,
        email: user.email,
      },
      createdAt: new Date().toISOString(),
      values,
      docxPath: savedDocxPath,
      htmlPath: "",
      pdfPath: savedPdfPath,
      firmId,
    });

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "GENERATE_DOCUMENT",
      details: `Generated Document ${documentNumber} from template ${template.name}`,
      firmId,
    });

    res.json(newDoc);
  } catch (err: any) {
    console.error("Document generation error:", err);
    res.status(500).json({ error: err.message || "Failed to compile document placeholders." });
  }
});

// History retrieval
app.get("/api/documents", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getDocuments(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get documents history failure" });
  }
});

app.get("/api/documents/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await Database.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }
    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && doc.firmId && doc.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to document." });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get document details failure" });
  }
});

// Download replaced DOCX file
app.get("/api/documents/:id/download-docx", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await Database.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && doc.firmId && doc.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to document." });
    }

    const ext = path.extname(doc.docxPath).toLowerCase() || ".docx";
    res.setHeader("Content-Disposition", `attachment; filename="${doc.documentNumber}${ext}"`);

    if (doc.docxPath.startsWith("supabase://")) {
      const buffer = await Database.getGeneratedFile(doc.docxPath);
      res.setHeader(
        "Content-Type",
        ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(buffer);
    } else {
      if (!fs.existsSync(doc.docxPath)) {
        return res.status(404).json({ error: "Replaced DOCX file not found." });
      }
      return res.sendFile(doc.docxPath);
    }
  } catch (err: any) {
    console.error("Download docx error:", err);
    res.status(500).json({ error: err.message || "Failed to download document." });
  }
});

// Helper to retrieve or generate PDF one-time from the stored DOCX
async function getOrGeneratePdf(doc: any): Promise<{ buffer: Buffer; fromCache: boolean; filePath?: string }> {
  let pdfPath = doc.pdfPath;

  // 1. Check if we already have the PDF stored
  if (pdfPath) {
    if (pdfPath.startsWith("supabase://")) {
      try {
        console.log(`[PDF-Serve] PDF found in Supabase storage: ${pdfPath}`);
        const buffer = await Database.getGeneratedFile(pdfPath);
        return { buffer, fromCache: true };
      } catch (err: any) {
        console.warn(`[PDF-Serve] Stored Supabase PDF could not be fetched: ${err.message || err}. Attempting on-the-fly conversion fallback.`);
      }
    } else {
      if (fs.existsSync(pdfPath)) {
        console.log(`[PDF-Serve] PDF found locally on disk: ${pdfPath}`);
        return { filePath: pdfPath, buffer: fs.readFileSync(pdfPath), fromCache: true };
      }
      // Check standard fallback path replacing extension
      const expectedPdfPath = doc.docxPath.replace(/\.[^/.]+$/, ".pdf");
      if (fs.existsSync(expectedPdfPath)) {
        console.log(`[PDF-Serve] PDF found locally at fallback path: ${expectedPdfPath}`);
        try {
          await Database.updateDocument(doc.id, { pdfPath: expectedPdfPath });
        } catch (dbErr) {
          console.warn("[PDF-Serve] Failed to update pdfPath in DB:", dbErr);
        }
        return { filePath: expectedPdfPath, buffer: fs.readFileSync(expectedPdfPath), fromCache: true };
      }
    }
  }

  // 2. If PDF does not exist, perform one-time conversion from stored DOCX
  console.log(`[PDF-Serve] PDF not found for document ${doc.id}. Initiating one-time conversion fallback from DOCX...`);
  
  if (!doc.docxPath) {
    throw new Error("PDF is not available because LibreOffice conversion failed.");
  }

  const originalExt = path.extname(doc.docxPath).toLowerCase() || ".docx";
  const tempDocxPath = path.join(Database.GENERATED_DIR, `${doc.id}-temp-restore${originalExt}`);
  const tempPdfPath = path.join(Database.GENERATED_DIR, `${doc.id}-temp-restore.pdf`);

  try {
    let docxBuffer: Buffer;
    if (doc.docxPath.startsWith("supabase://")) {
      docxBuffer = await Database.getGeneratedFile(doc.docxPath);
    } else {
      if (!fs.existsSync(doc.docxPath)) {
        throw new Error("Source DOCX file does not exist on disk.");
      }
      docxBuffer = fs.readFileSync(doc.docxPath);
    }

    // Write source DOCX locally to run conversion
    fs.writeFileSync(tempDocxPath, docxBuffer);

    // Perform conversion
    const generatedPdfPath = await convertOfficeToPdf(tempDocxPath, Database.GENERATED_DIR);
    const pdfBuffer = fs.readFileSync(generatedPdfPath);

    let finalPdfPath = "";
    if (Database.isSupabaseEnabled) {
      // Save both to Supabase to reuse
      const storagePaths = await Database.saveGeneratedDocumentFiles(doc.id, docxBuffer, pdfBuffer, originalExt);
      finalPdfPath = storagePaths.pdfPath || "";
      await Database.updateDocument(doc.id, { pdfPath: finalPdfPath });

      // Cleanup local temp files created during conversion and upload
      try {
        if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        if (fs.existsSync(generatedPdfPath)) fs.unlinkSync(generatedPdfPath);
      } catch (cleanupErr) {
        console.error("[PDF-Serve] Error cleaning up temporary files after Supabase upload:", cleanupErr);
      }

      return { buffer: pdfBuffer, fromCache: false };
    } else {
      // Local storage - save generated PDF permanently to final location
      const localPermanentPdfPath = path.join(Database.GENERATED_DIR, `${doc.id}.pdf`);
      fs.copyFileSync(generatedPdfPath, localPermanentPdfPath);
      await Database.updateDocument(doc.id, { pdfPath: localPermanentPdfPath });

      // Clean up temp files
      try {
        if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        if (fs.existsSync(generatedPdfPath)) fs.unlinkSync(generatedPdfPath);
      } catch (cleanupErr) {
        console.error("[PDF-Serve] Error cleaning up temporary files:", cleanupErr);
      }

      return { filePath: localPermanentPdfPath, buffer: pdfBuffer, fromCache: false };
    }
  } catch (err: any) {
    console.error("[PDF-Serve] One-time PDF fallback conversion failed:", err.message || err);
    // Cleanup on failure
    try {
      if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    } catch (e) {}
    throw new Error("PDF is not available because LibreOffice conversion failed.");
  }
}

// Download replaced PDF file
app.get("/api/documents/:id/download-pdf", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await Database.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && doc.firmId && doc.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to document." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.documentNumber}.pdf"`);
    res.setHeader("Cache-Control", "no-store");

    const result = await getOrGeneratePdf(doc);
    if (result.filePath) {
      return res.sendFile(result.filePath);
    } else {
      return res.send(result.buffer);
    }
  } catch (err: any) {
    console.error("Download PDF error:", err);
    res.status(500).json({ error: err.message || "PDF conversion failed because LibreOffice is unavailable or conversion failed." });
  }
});

// View PDF file inline - supports /view-pdf and /preview-pdf
const servePdfInline = async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const doc = await Database.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && doc.firmId && doc.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to document." });
    }

    // Remove frame headers and set inline pdf content headers
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.documentNumber}.pdf"`);
    res.setHeader("Cache-Control", "no-store");

    const result = await getOrGeneratePdf(doc);
    if (result.filePath) {
      return res.sendFile(result.filePath);
    } else {
      return res.send(result.buffer);
    }
  } catch (err: any) {
    console.error("Serve PDF inline error:", err);
    res.status(500).json({ error: err.message || "PDF conversion failed because LibreOffice is unavailable or conversion failed." });
  }
};

app.get("/api/documents/:id/view-pdf", authenticate, servePdfInline);
app.get("/api/documents/:id/preview-pdf", authenticate, servePdfInline);

// Retrieve preview HTML
app.get("/api/documents/:id/preview-html", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await Database.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Verify multi-tenancy access
    if (!isSuperAdmin(user) && doc.firmId && doc.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to document." });
    }

    if (!fs.existsSync(doc.htmlPath)) {
      return res.status(404).json({ error: "Preview HTML file not found." });
    }
    const htmlContent = fs.readFileSync(doc.htmlPath, "utf-8");
    res.send(htmlContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Preview HTML failure" });
  }
});

// 7. General Organization Settings
app.get("/api/settings", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getSettings(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get settings failure" });
  }
});

app.put("/api/settings", authenticate, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const firmId = getFirmId(req);

    const updatedSettings = await Database.updateSettings({ ...req.body, firmId });

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "UPDATE_SETTINGS",
      details: `Updated enterprise platform settings`,
      firmId,
    });

    res.json(updatedSettings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Edit settings failure" });
  }
});

// 7b. Organization Profiles
app.get("/api/organization-profiles", authenticate, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getOrganizationProfiles(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get organization profiles failure" });
  }
});

app.get("/api/organization-profiles/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const profile = await Database.getOrganizationProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Organization profile not found." });
    }

    if (!isSuperAdmin(user) && profile.firmId && profile.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to profile." });
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get organization profile failure" });
  }
});

app.post("/api/organization-profiles", authenticate, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const firmId = user.firmId;

    const profile = await Database.createOrganizationProfile({ ...req.body, firmId });

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "CREATE_ORG_PROFILE",
      details: `Created organization profile: ${profile.organizationName}`,
      firmId,
    });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Create profile failure" });
  }
});

app.put("/api/organization-profiles/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const firmId = user.firmId;

    const originalProfile = await Database.getOrganizationProfile(req.params.id);
    if (!originalProfile) {
      return res.status(404).json({ error: "Organization profile not found." });
    }

    if (!isSuperAdmin(user) && originalProfile.firmId && originalProfile.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to profile." });
    }

    const updated = await Database.updateOrganizationProfile(req.params.id, { ...req.body, firmId });

    await Database.createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: "UPDATE_ORG_PROFILE",
      details: `Updated organization profile: ${updated.organizationName}`,
      firmId,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Edit profile failure" });
  }
});

app.delete("/api/organization-profiles/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const firmId = getFirmId(req);

    const profile = await Database.getOrganizationProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Organization profile not found." });
    }

    if (!isSuperAdmin(user) && profile.firmId && profile.firmId !== user.firmId) {
      return res.status(403).json({ error: "Unauthorized access to profile." });
    }

    const success = await Database.deleteOrganizationProfile(req.params.id);
    if (success) {
      await Database.createAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        action: "DELETE_ORG_PROFILE",
        details: `Deleted organization profile: ${profile.organizationName}`,
        firmId,
      });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete organization profile." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Delete profile failure" });
  }
});

// 7.5 Super Admin Endpoints
app.get("/api/superadmin/firms", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const role = String(user.role).toLowerCase();
    if (role !== "super_admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden. Super Admin role required." });
    }
    const firms = await Database.getFirms();
    res.json(firms);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch firms list" });
  }
});

app.put("/api/superadmin/firms/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const role = String(user.role).toLowerCase();
    if (role !== "super_admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden. Super Admin role required." });
    }
    const { id } = req.params;
    const updatedFirm = await Database.updateFirm(id, req.body);
    if (!updatedFirm) {
      return res.status(404).json({ error: "Firm not found" });
    }
    res.json(updatedFirm);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update firm" });
  }
});

app.get("/api/superadmin/stats", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const role = String(user.role).toLowerCase();
    if (role !== "super_admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden. Super Admin role required." });
    }
    const templates = await Database.getTemplates(undefined);
    const docs = await Database.getDocuments(undefined);
    
    // Formatting uptime nicely
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = Math.round(uptimeSeconds % 60);
    const uptimeStr = hours > 0 ? `${hours}h ${mins}m ${secs}s` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    res.json({
      totalTemplates: templates.length,
      totalDocuments: docs.length,
      env: process.env.NODE_ENV || "development",
      databaseType: Database.isSupabaseEnabled ? "Supabase (PostgreSQL)" : "Local JSON File Store",
      memoryUsage: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      uptime: uptimeStr
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load superadmin stats" });
  }
});

// 8. Audit Logs
app.get("/api/audit-logs", authenticate, requireAdmin, async (req, res) => {
  try {
    const firmId = getFirmId(req);
    res.json(await Database.getAuditLogs(firmId));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Get audit logs failure" });
  }
});

// 9. System Diagnostics
app.get("/api/health", async (req, res) => {
  try {
    res.json({
      success: true,
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      apiBase: `${req.protocol}://${req.get("host")}`,
      storageMode: Database.isSupabaseEnabled ? "supabase" : "local-json",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, status: "unhealthy", error: err.message || "Health check failed" });
  }
});

app.get("/api/system/health", authenticate, async (req, res) => {
  try {
    const dbTest = await Database.getCategories(""); // just check if db doesn't crash
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        mode: Database.isSupabaseEnabled ? "supabase" : "local-json",
        connected: Array.isArray(dbTest),
      },
      environment: process.env.NODE_ENV || "development",
      platform: process.platform,
      nodeVersion: process.version,
    });
  } catch (err: any) {
    res.status(500).json({ status: "unhealthy", error: err.message || "System health check failed" });
  }
});

app.get("/api/system/pdf-engine-status", authenticate, async (req, res) => {
  try {
    let libreOfficePath = "";
    let isLibreOfficeAvailable = false;
    let libreOfficeVersion = "";

    try {
      libreOfficePath = resolveLibreOfficePath();
      isLibreOfficeAvailable = true;
      libreOfficeVersion = getLibreOfficeVersion();
    } catch (err: any) {
      libreOfficePath = "None";
      isLibreOfficeAvailable = false;
      libreOfficeVersion = `Unavailable: ${err.message || err}`;
    }

    res.json({
      platform: process.platform,
      libreOfficePath,
      libreOfficeVersion,
      isLibreOfficeAvailable,
      cloudMode: Database.isSupabaseEnabled ? "cloud" : "local",
      tempDirectory: Database.GENERATED_DIR,
      storageMode: Database.isSupabaseEnabled ? "supabase" : "local",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve engine status" });
  }
});

// Fallback for all unknown /api/* routes (return JSON only, never HTML)
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.url}`
  });
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Handler Intercepted:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "An unexpected server error occurred.",
    code: err.code || "INTERNAL_SERVER_ERROR"
  });
});

// --- VITE MIDDLEWARE CONFIGURATION ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Log LibreOffice details during container startup
    try {
      const loPath = resolveLibreOfficePath();
      const loVersion = getLibreOfficeVersion();
      console.log(`[Startup] LibreOffice resolved path: ${loPath}`);
      console.log(`[Startup] LibreOffice version: ${loVersion}`);
    } catch (err: any) {
      console.error(`[Startup] LibreOffice status check failed: ${err.message || err}`);
    }
  });
}

startServer();
