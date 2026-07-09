/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  Category,
  DropdownMaster,
  Template,
  GeneratedDocument,
  AuditLog,
  OrganizationSettings,
  User,
  UserRole,
  OrganizationProfile,
  Firm,
  TemplateUserAccess,
} from "../src/types";

// Environment Setup
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export let isSupabaseEnabled = !!(supabaseUrl && supabaseServiceKey);

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

// Self-healing: verify if Supabase is actually working and tables exist. If not, fallback to JSON.
let dbCheckPromise: Promise<boolean> | null = null;

export async function ensureDbConnected(): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;
  if (dbCheckPromise) return dbCheckPromise;

  dbCheckPromise = (async () => {
    try {
      const { data, error } = await supabase.from("firms").select("id").limit(1);
      if (error) {
        console.warn("\n⚠️ Supabase connection test failed or table 'firms' does not exist:", error.message);
        console.warn("⚠️ Automatically falling back to local JSON file database for robust reliability.\n");
        isSupabaseEnabled = false;
        return false;
      } else {
        console.log("\n✅ Supabase tables verified and connected successfully.\n");
        return true;
      }
    } catch (err: any) {
      console.warn("\n⚠️ Exception during Supabase initialization check:", err.message || err);
      console.warn("⚠️ Automatically falling back to local JSON file database for robust reliability.\n");
      isSupabaseEnabled = false;
      return false;
    }
  })();

  return dbCheckPromise;
}

if (isSupabaseEnabled) {
  ensureDbConnected().catch(() => {});
}

// Local directories
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const GENERATED_DIR = path.join(DATA_DIR, "generated");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

const FIRMS_FILE = path.join(DATA_DIR, "firms.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const TEMPLATES_FILE = path.join(DATA_DIR, "templates.json");
const DROPDOWNS_FILE = path.join(DATA_DIR, "dropdowns.json");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");
const AUDIT_LOGS_FILE = path.join(DATA_DIR, "audit_logs.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORG_PROFILES_FILE = path.join(DATA_DIR, "org_profiles.json");
const TEMPLATE_ACCESS_FILE = path.join(DATA_DIR, "template_access.json");

// Helper to read JSON safely
function readJSON<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

// Helper to write JSON safely
function writeJSON<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
}

// Default Seed Data
const DEFAULT_FIRMS: Firm[] = [
  {
    id: "firm-default",
    name: "Apex Enterprise Solutions",
    email: "admin@apex.com",
    mobile: "+91 98765 43210",
    plan: "enterprise",
    status: "active",
    isVerified: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Letters", description: "Standard official letters & communication", createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "cat-2", name: "Certificates", description: "Achievement, training, and completion awards", createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "cat-3", name: "HR Documents", description: "Offer letters, appointment, and policy undertakings", createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "cat-4", name: "Legal & Contracts", description: "Non-disclosure agreements, service level agreements", createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "cat-5", name: "Invoices & POs", description: "Billing statements and purchase orders", createdAt: new Date().toISOString(), firmId: "firm-default" },
];

const DEFAULT_DROPDOWNS: DropdownMaster[] = [
  { id: "dd-1", name: "Designation", options: ["Director", "General Manager", "Engineering Lead", "Senior Developer", "HR Specialist", "Business Analyst"], createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "dd-2", name: "Department", options: ["Engineering", "Human Resources", "Legal & Compliance", "Finance & Accounts", "Sales & Marketing"], createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "dd-3", name: "Indian States", options: ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Telangana"], createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "dd-4", name: "US States", options: ["California", "New York", "Texas", "Florida", "Washington", "Illinois"], createdAt: new Date().toISOString(), firmId: "firm-default" },
  { id: "dd-5", name: "Project Type", options: ["Fixed Bid", "Time & Material", "Retainer", "Internal Research"], createdAt: new Date().toISOString(), firmId: "firm-default" },
];

const DEFAULT_SETTINGS: OrganizationSettings = {
  organizationName: "Apex Enterprise Solutions",
  address: "404, Tech Park, Phase-II, Sector-V, Pune - 411057, India",
  logo: "",
  digitalSignature: "",
  footer: "This is a computer-generated document. Confidentiality Guaranteed.",
  defaultMargins: { top: 1, bottom: 1, left: 1, right: 1 },
  defaultPaperSize: "A4",
  documentNumberPattern: "DOC-[YYYY]-000[COUNT]",
  timezone: "Asia/Kolkata (GMT+5:30)",
  language: "en",
  placeholderSyntax: "all",
  firmId: "firm-default",
};

const DEFAULT_USERS: (User & { passwordHash: string })[] = [
  {
    id: "user-admin",
    username: "mayurdivate24",
    name: "Mayur Divate",
    email: "admin@apex.com",
    role: UserRole.SUPER_ADMIN,
    createdAt: new Date().toISOString(),
    passwordHash: "oMsairaM@4",
    firmId: undefined,
    isVerified: true,
  },
  {
    id: "user-regular",
    username: "user",
    name: "John Smith (User)",
    email: "john@apex.com",
    role: UserRole.USER,
    createdAt: new Date().toISOString(),
    passwordHash: "user123",
    firmId: "firm-default",
    isVerified: true,
  },
];

const DEFAULT_ORG_PROFILES: OrganizationProfile[] = [
  {
    id: "prof-1",
    name: "Apex Corporate Profile",
    organizationName: "Apex Enterprise Solutions Ltd.",
    logo: "",
    address: "101, Business Tower, Bandra Kurla Complex, Mumbai - 400051, India",
    contactNumber: "+91 22 5555 1234",
    email: "contact@apex.com",
    website: "www.apexenterprise.com",
    gstNumber: "27AAAAA1111A1Z1",
    panNumber: "AAAAA1111A",
    footerText: "Apex Enterprise Solutions - Confidential and Proprietary Document",
    authorizedSignatory: "Jane Doe, Director of Operations",
    digitalSignature: "",
    headerDesign: "standard",
    footerDesign: "standard",
    letterheadBackground: "",
    createdAt: new Date().toISOString(),
    firmId: "firm-default",
  }
];

// Seed initial database files locally
if (!fs.existsSync(FIRMS_FILE)) writeJSON(FIRMS_FILE, DEFAULT_FIRMS);
if (!fs.existsSync(CATEGORIES_FILE)) writeJSON(CATEGORIES_FILE, DEFAULT_CATEGORIES);
if (!fs.existsSync(DROPDOWNS_FILE)) writeJSON(DROPDOWNS_FILE, DEFAULT_DROPDOWNS);
if (!fs.existsSync(SETTINGS_FILE)) writeJSON(SETTINGS_FILE, DEFAULT_SETTINGS);

if (!fs.existsSync(USERS_FILE)) {
  writeJSON(USERS_FILE, DEFAULT_USERS);
} else {
  const existingUsers = readJSON<any[]>(USERS_FILE, []);
  const mayurExists = existingUsers.some(u => u.username === "mayurdivate24");
  if (!mayurExists) {
    const filtered = existingUsers.filter(u => u.username !== "admin");
    filtered.push({
      id: "user-admin",
      username: "mayurdivate24",
      name: "Mayur Divate",
      email: "admin@apex.com",
      role: UserRole.SUPER_ADMIN,
      createdAt: new Date().toISOString(),
      passwordHash: "oMsairaM@4",
      firmId: undefined,
      isVerified: true,
    });
    writeJSON(USERS_FILE, filtered);
  } else {
    // Ensure mayur has SUPER_ADMIN role
    const updatedUsers = existingUsers.map(u => {
      if (u.username === "mayurdivate24") {
        return { ...u, role: UserRole.SUPER_ADMIN };
      }
      return u;
    });
    writeJSON(USERS_FILE, updatedUsers);
  }
}

if (!fs.existsSync(TEMPLATES_FILE)) writeJSON(TEMPLATES_FILE, []);
if (!fs.existsSync(DOCUMENTS_FILE)) writeJSON(DOCUMENTS_FILE, []);
if (!fs.existsSync(AUDIT_LOGS_FILE)) writeJSON(AUDIT_LOGS_FILE, []);
if (!fs.existsSync(ORG_PROFILES_FILE)) writeJSON(ORG_PROFILES_FILE, DEFAULT_ORG_PROFILES);
if (!fs.existsSync(TEMPLATE_ACCESS_FILE)) writeJSON(TEMPLATE_ACCESS_FILE, []);

// Ensure Storage Buckets exist in Supabase
async function ensureBucketExists(bucketName: string) {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName);
    const isPublic = bucketName === "logos";
    if (error || !data) {
      await supabase.storage.createBucket(bucketName, { public: isPublic });
    } else {
      // Update visibility if it exists but is set differently
      if (data.public !== isPublic) {
        await supabase.storage.updateBucket(bucketName, { public: isPublic });
      }
    }
  } catch (err) {
    // Suppress since bucket might exist or permission limits
  }
}

if (isSupabaseEnabled) {
  ensureBucketExists("templates").catch(console.error);
  ensureBucketExists("generated-documents").catch(console.error);
  ensureBucketExists("logos").catch(console.error);
  ensureBucketExists("signatures").catch(console.error);
}

// ==========================================
// MAPPER FUNCTIONS FOR POSTGRES <-> JS
// ==========================================

function mapFirmToDb(firm: any) {
  return {
    id: firm.id,
    name: firm.name,
    email: firm.email,
    mobile: firm.mobile || null,
    plan: firm.plan || "free_trial",
    status: firm.status || "active",
    verification_token: firm.verificationToken || null,
    is_verified: firm.isVerified !== undefined ? firm.isVerified : false,
    created_at: firm.createdAt,
  };
}
function mapDbToFirm(row: any): Firm {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile || undefined,
    plan: row.plan || "free_trial",
    status: row.status || "active",
    verificationToken: row.verification_token || undefined,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

function mapUserToDb(user: any) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    password_hash: user.passwordHash,
    firm_id: user.firmId || null,
    is_verified: user.isVerified !== undefined ? user.isVerified : true,
    verification_token: user.verificationToken || null,
    created_at: user.createdAt,
    mobile: user.mobile || null,
    designation: user.designation || null,
    is_active: user.isActive !== undefined ? user.isActive : true,
  };
}
function mapRole(role: string): UserRole {
  const r = String(role).toLowerCase();
  if (r === "superadmin" || r === "super_admin") {
    return UserRole.SUPER_ADMIN;
  }
  if (r === "administrator" || r === "admin" || r === "firm_admin") {
    return UserRole.FIRM_ADMIN;
  }
  return UserRole.USER;
}

function mapDbToUser(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: mapRole(row.role),
    passwordHash: row.password_hash,
    firmId: row.firm_id || undefined,
    isVerified: row.is_verified !== undefined ? row.is_verified : true,
    verificationToken: row.verification_token || undefined,
    createdAt: row.created_at,
    mobile: row.mobile || undefined,
    designation: row.designation || undefined,
    isActive: row.is_active !== undefined ? row.is_active : true,
  };
}

function mapCategoryToDb(cat: any) {
  return {
    id: cat.id,
    name: cat.name,
    description: cat.description,
    firm_id: cat.firmId || null,
    created_at: cat.createdAt,
  };
}
function mapDbToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    firmId: row.firm_id || undefined,
    createdAt: row.created_at,
  };
}

function mapTemplateToDb(tpl: any) {
  return {
    id: tpl.id,
    name: tpl.name,
    description: tpl.description,
    category_id: tpl.categoryId,
    file_path: tpl.filePath,
    placeholders: tpl.placeholders,
    is_archived: tpl.isArchived,
    branding_mode: tpl.brandingMode,
    firm_id: tpl.firmId || null,
    created_at: tpl.createdAt,
    updated_at: tpl.updatedAt,
  };
}
function mapDbToTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    filePath: row.file_path,
    placeholders: row.placeholders,
    isArchived: row.is_archived,
    brandingMode: row.branding_mode,
    firmId: row.firm_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocumentToDb(doc: any) {
  return {
    id: doc.id,
    document_number: doc.documentNumber,
    template_id: doc.templateId,
    template_name: doc.templateName,
    category_id: doc.categoryId,
    category_name: doc.categoryName,
    generated_by: doc.generatedBy,
    values: doc.values,
    docx_path: doc.docxPath,
    html_path: doc.htmlPath,
    pdf_path: doc.pdfPath,
    firm_id: doc.firmId || null,
    created_at: doc.createdAt,
  };
}
function mapDbToDocument(row: any): GeneratedDocument {
  return {
    id: row.id,
    documentNumber: row.document_number,
    templateId: row.template_id,
    templateName: row.template_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    generatedBy: row.generated_by,
    values: row.values,
    docxPath: row.docx_path,
    htmlPath: row.html_path,
    pdfPath: row.pdf_path || undefined,
    firmId: row.firm_id || undefined,
    createdAt: row.created_at,
  };
}

function mapProfileToDb(prof: any) {
  return {
    id: prof.id,
    name: prof.name,
    organization_name: prof.organizationName,
    logo: prof.logo,
    address: prof.address,
    contact_number: prof.contactNumber,
    email: prof.email,
    website: prof.website,
    gst_number: prof.gstNumber,
    pan_number: prof.panNumber,
    footer_text: prof.footerText,
    authorized_signatory: prof.authorizedSignatory,
    digital_signature: prof.digitalSignature,
    header_design: prof.headerDesign,
    footer_design: prof.footerDesign,
    letterhead_background: prof.letterheadBackground,
    firm_id: prof.firmId || null,
    created_at: prof.createdAt,
  };
}
function mapDbToProfile(row: any): OrganizationProfile {
  return {
    id: row.id,
    name: row.name,
    organizationName: row.organization_name,
    logo: row.logo,
    address: row.address,
    contactNumber: row.contact_number,
    email: row.email,
    website: row.website,
    gstNumber: row.gst_number,
    panNumber: row.pan_number,
    footerText: row.footer_text,
    authorizedSignatory: row.authorized_signatory,
    digitalSignature: row.digital_signature,
    headerDesign: row.header_design,
    footerDesign: row.footer_design,
    letterheadBackground: row.letterhead_background,
    firmId: row.firm_id || undefined,
    createdAt: row.created_at,
  };
}

function mapDropdownToDb(dd: any) {
  return {
    id: dd.id,
    name: dd.name,
    options: dd.options,
    firm_id: dd.firmId || null,
    created_at: dd.createdAt,
  };
}
function mapDbToDropdown(row: any): DropdownMaster {
  return {
    id: row.id,
    name: row.name,
    options: row.options,
    firmId: row.firm_id || undefined,
    createdAt: row.created_at,
  };
}

function mapAuditLogToDb(log: any) {
  return {
    id: log.id,
    user_id: log.userId,
    user_name: log.userName,
    user_email: log.userEmail,
    role: log.role,
    action: log.action,
    details: log.details,
    firm_id: log.firmId || null,
    timestamp: log.timestamp,
  };
}
function mapDbToAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    role: mapRole(row.role),
    action: row.action,
    details: row.details,
    firmId: row.firm_id || undefined,
    timestamp: row.timestamp,
  };
}

function mapSettingsToDb(settings: any) {
  return {
    id: "system-settings",
    organization_name: settings.organizationName,
    address: settings.address,
    logo: settings.logo,
    digital_signature: settings.digitalSignature,
    footer: settings.footer,
    default_margins: settings.defaultMargins,
    default_paper_size: settings.defaultPaperSize,
    document_number_pattern: settings.documentNumberPattern,
    timezone: settings.timezone,
    language: settings.language,
    placeholder_syntax: settings.placeholderSyntax,
    firm_id: settings.firmId || null,
  };
}
function mapDbToSettings(row: any): OrganizationSettings {
  return {
    organizationName: row.organization_name,
    address: row.address,
    logo: row.logo,
    digitalSignature: row.digital_signature,
    footer: row.footer,
    defaultMargins: row.default_margins,
    defaultPaperSize: row.default_paper_size,
    documentNumberPattern: row.document_number_pattern,
    timezone: row.timezone,
    language: row.language,
    placeholderSyntax: row.placeholder_syntax,
    firmId: row.firm_id || undefined,
  };
}

function mapDbToTemplateAccess(row: any): TemplateUserAccess {
  return {
    id: row.id,
    firmId: row.firm_id,
    templateId: row.template_id,
    userId: row.user_id,
    assignedBy: row.assigned_by,
    createdAt: row.created_at,
  };
}

function mapTemplateAccessToDb(access: TemplateUserAccess): any {
  return {
    id: access.id,
    firm_id: access.firmId,
    template_id: access.templateId,
    user_id: access.userId,
    assigned_by: access.assignedBy || null,
    created_at: access.createdAt,
  };
}

// ==========================================
// EXPORTED DATABASE IMPLEMENTATION (PROMISIFIED)
// ==========================================

export const Database = {
  DATA_DIR,
  UPLOADS_DIR,
  GENERATED_DIR,
  get isSupabaseEnabled() {
    return isSupabaseEnabled;
  },

  // --- STORAGE INTEGRATION ---

  async saveTemplateFile(templateId: string, buffer: Buffer, ext: string): Promise<string> {
    if (isSupabaseEnabled && supabase) {
      const bucketName = "templates";
      const key = `templates/${templateId}/original${ext}`;
      const { error } = await supabase.storage.from(bucketName).upload(key, buffer, {
        contentType: ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
      if (error) throw error;
      return `supabase://${bucketName}/${key}`;
    } else {
      const physicalPath = path.join(UPLOADS_DIR, `${templateId}${ext}`);
      fs.writeFileSync(physicalPath, buffer);
      return physicalPath;
    }
  },

  async getTemplateFile(templateId: string, filePathOrVirtual: string): Promise<Buffer> {
    if (filePathOrVirtual.startsWith("supabase://") && supabase) {
      const parsed = filePathOrVirtual.replace("supabase://", "");
      const slashIdx = parsed.indexOf("/");
      const bucket = parsed.substring(0, slashIdx);
      const key = parsed.substring(slashIdx + 1);

      const { data, error } = await supabase.storage.from(bucket).download(key);
      if (error) throw error;
      return Buffer.from(await data.arrayBuffer());
    } else {
      if (fs.existsSync(filePathOrVirtual)) {
        return fs.readFileSync(filePathOrVirtual);
      }
      // Fallback if filepath was updated to relative
      const localFallback = path.join(UPLOADS_DIR, path.basename(filePathOrVirtual));
      if (fs.existsSync(localFallback)) {
        return fs.readFileSync(localFallback);
      }
      throw new Error(`Template file not found: ${filePathOrVirtual}`);
    }
  },

  async saveGeneratedDocumentFiles(docId: string, docxBuffer: Buffer, pdfBuffer: Buffer | null, ext: string): Promise<{ docxPath: string; pdfPath?: string }> {
    if (isSupabaseEnabled && supabase) {
      const bucketName = "generated-documents";
      
      const docxKey = `generated-documents/${docId}/generated${ext}`;
      const { error: docxErr } = await supabase.storage.from(bucketName).upload(docxKey, docxBuffer, {
        contentType: ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
      if (docxErr) throw docxErr;

      let pdfPath: string | undefined = undefined;
      if (pdfBuffer) {
        const pdfKey = `generated-documents/${docId}/generated.pdf`;
        const { error: pdfErr } = await supabase.storage.from(bucketName).upload(pdfKey, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });
        if (pdfErr) throw pdfErr;
        pdfPath = `supabase://${bucketName}/${pdfKey}`;
      }

      return {
        docxPath: `supabase://${bucketName}/${docxKey}`,
        pdfPath,
      };
    } else {
      const physicalDocxPath = path.join(GENERATED_DIR, `${docId}${ext}`);
      fs.writeFileSync(physicalDocxPath, docxBuffer);

      let physicalPdfPath: string | undefined = undefined;
      if (pdfBuffer) {
        physicalPdfPath = path.join(GENERATED_DIR, `${docId}.pdf`);
        fs.writeFileSync(physicalPdfPath, pdfBuffer);
      }

      return {
        docxPath: physicalDocxPath,
        pdfPath: physicalPdfPath,
      };
    }
  },

  async getGeneratedFile(virtualPath: string): Promise<Buffer> {
    if (virtualPath.startsWith("supabase://") && supabase) {
      const parsed = virtualPath.replace("supabase://", "");
      const slashIdx = parsed.indexOf("/");
      const bucket = parsed.substring(0, slashIdx);
      const key = parsed.substring(slashIdx + 1);

      const { data, error } = await supabase.storage.from(bucket).download(key);
      if (error) throw error;
      return Buffer.from(await data.arrayBuffer());
    } else {
      if (fs.existsSync(virtualPath)) {
        return fs.readFileSync(virtualPath);
      }
      throw new Error(`Generated file not found: ${virtualPath}`);
    }
  },

  // --- DATABASE OPERATIONS ---

  // Firms
  async getFirms(): Promise<Firm[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from("firms").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(mapDbToFirm);
      } catch (err: any) {
        console.warn("Supabase getFirms failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    return readJSON<Firm[]>(FIRMS_FILE, DEFAULT_FIRMS);
  },

  async getFirm(id: string): Promise<Firm | undefined> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from("firms").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? mapDbToFirm(data) : undefined;
      } catch (err: any) {
        console.warn("Supabase getFirm failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const firms = await this.getFirms();
    return firms.find((f) => f.id === id);
  },

  async createFirm(firm: Firm): Promise<Firm> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("firms").insert(mapFirmToDb(firm));
        if (error) throw error;
        return firm;
      } catch (err: any) {
        console.warn("Supabase createFirm failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const firms = await this.getFirms();
    firms.push(firm);
    writeJSON(FIRMS_FILE, firms);
    return firm;
  },

  async updateFirm(id: string, updated: Partial<Firm>): Promise<Firm | null> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const dbPayload: any = {};
        if (updated.name !== undefined) dbPayload.name = updated.name;
        if (updated.email !== undefined) dbPayload.email = updated.email;
        if (updated.mobile !== undefined) dbPayload.mobile = updated.mobile;
        if (updated.plan !== undefined) dbPayload.plan = updated.plan;
        if (updated.status !== undefined) dbPayload.status = updated.status;
        if (updated.isVerified !== undefined) dbPayload.is_verified = updated.isVerified;
        if (updated.verificationToken !== undefined) dbPayload.verification_token = updated.verificationToken;

        const { data, error } = await supabase
          .from("firms")
          .update(dbPayload)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data ? mapDbToFirm(data) : null;
      } catch (err: any) {
        console.warn("Supabase updateFirm failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const firms = await this.getFirms();
    const idx = firms.findIndex((f) => f.id === id);
    if (idx !== -1) {
      firms[idx] = { ...firms[idx], ...updated };
      writeJSON(FIRMS_FILE, firms);
      return firms[idx];
    }
    return null;
  },

  // Users
  async getUsers(firmId?: string): Promise<User[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("users").select("*");
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToUser);
      } catch (err: any) {
        console.error("Supabase getUsers failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allUsers = readJSON<any[]>(USERS_FILE, []).map(u => ({
      ...u,
      role: mapRole(u.role)
    }));
    if (firmId) {
      return allUsers.filter((u) => u.firmId === firmId);
    }
    return allUsers;
  },

  async getUserByUsername(username: string) {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("username", username)
          .maybeSingle();
        if (error) throw error;
        return mapDbToUser(data);
      } catch (err: any) {
        console.error("Supabase getUserByUsername failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const users = await this.getUsers();
    return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async createUser(user: User & { passwordHash: string }) {
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("users").insert(mapUserToDb(user));
        if (error) throw error;
        return user;
      } catch (err: any) {
        console.error("Supabase createUser failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const users = readJSON<any[]>(USERS_FILE, []);
    users.push(user);
    writeJSON(USERS_FILE, users);
    return user;
  },

  async updateUser(id: string, updated: any) {
    if (isSupabaseEnabled && supabase) {
      try {
        // Map keys to snake_case
        const dbPayload: any = {};
        if (updated.username !== undefined) dbPayload.username = updated.username;
        if (updated.name !== undefined) dbPayload.name = updated.name;
        if (updated.email !== undefined) dbPayload.email = updated.email;
        if (updated.role !== undefined) dbPayload.role = updated.role;
        if (updated.passwordHash !== undefined) dbPayload.password_hash = updated.passwordHash;
        if (updated.firmId !== undefined) dbPayload.firm_id = updated.firmId || null;
        if (updated.isVerified !== undefined) dbPayload.is_verified = updated.isVerified;
        if (updated.verificationToken !== undefined) dbPayload.verification_token = updated.verificationToken || null;

        const { data, error } = await supabase
          .from("users")
          .update(dbPayload)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return mapDbToUser(data);
      } catch (err: any) {
        console.error("Supabase updateUser failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const users = readJSON<any[]>(USERS_FILE, []);
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updated };
      writeJSON(USERS_FILE, users);
      return users[index];
    }
    return null;
  },

  async deleteUser(id: string) {
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("users").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.error("Supabase deleteUser failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const users = readJSON<any[]>(USERS_FILE, []);
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users.splice(index, 1);
      writeJSON(USERS_FILE, users);
      return true;
    }
    return false;
  },

  // Categories
  async getCategories(firmId?: string): Promise<Category[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("categories").select("*").order("name");
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToCategory);
      } catch (err: any) {
        console.warn("Supabase getCategories failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allCategories = readJSON<Category[]>(CATEGORIES_FILE, []);
    if (firmId) {
      return allCategories.filter((c) => c.firmId === firmId);
    }
    return allCategories;
  },

  async createCategory(category: Category): Promise<Category> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("categories").insert(mapCategoryToDb(category));
        if (error) throw error;
        return category;
      } catch (err: any) {
        console.warn("Supabase createCategory failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const categories = readJSON<Category[]>(CATEGORIES_FILE, []);
    categories.push(category);
    writeJSON(CATEGORIES_FILE, categories);
    return category;
  },

  async deleteCategory(id: string): Promise<boolean> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.warn("Supabase deleteCategory failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const categories = readJSON<Category[]>(CATEGORIES_FILE, []);
    const index = categories.findIndex((c) => c.id === id);
    if (index !== -1) {
      categories.splice(index, 1);
      writeJSON(CATEGORIES_FILE, categories);
      return true;
    }
    return false;
  },

  // Dropdowns
  async getDropdowns(firmId?: string): Promise<DropdownMaster[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("dropdown_master").select("*").order("name");
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToDropdown);
      } catch (err: any) {
        console.warn("Supabase getDropdowns failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allDropdowns = readJSON<DropdownMaster[]>(DROPDOWNS_FILE, []);
    if (firmId) {
      return allDropdowns.filter((d) => d.firmId === firmId);
    }
    return allDropdowns;
  },

  async createDropdown(dropdown: DropdownMaster): Promise<DropdownMaster> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("dropdown_master").insert(mapDropdownToDb(dropdown));
        if (error) throw error;
        return dropdown;
      } catch (err: any) {
        console.warn("Supabase createDropdown failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const dropdowns = readJSON<DropdownMaster[]>(DROPDOWNS_FILE, []);
    dropdowns.push(dropdown);
    writeJSON(DROPDOWNS_FILE, dropdowns);
    return dropdown;
  },

  async updateDropdown(id: string, name: string, options: string[]): Promise<DropdownMaster | null> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("dropdown_master")
          .update({ name, options })
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return mapDbToDropdown(data);
      } catch (err: any) {
        console.warn("Supabase updateDropdown failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const dropdowns = readJSON<DropdownMaster[]>(DROPDOWNS_FILE, []);
    const dropdown = dropdowns.find((d) => d.id === id);
    if (dropdown) {
      dropdown.name = name;
      dropdown.options = options;
      writeJSON(DROPDOWNS_FILE, dropdowns);
      return dropdown;
    }
    return null;
  },

  async deleteDropdown(id: string): Promise<boolean> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("dropdown_master").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.warn("Supabase deleteDropdown failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const dropdowns = readJSON<DropdownMaster[]>(DROPDOWNS_FILE, []);
    const index = dropdowns.findIndex((d) => d.id === id);
    if (index !== -1) {
      dropdowns.splice(index, 1);
      writeJSON(DROPDOWNS_FILE, dropdowns);
      return true;
    }
    return false;
  },

  // Templates
  async getTemplates(firmId?: string): Promise<Template[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("templates").select("*");
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToTemplate);
      } catch (err: any) {
        console.warn("Supabase getTemplates failed, falling back to JSON:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allTemplates = readJSON<Template[]>(TEMPLATES_FILE, []);
    if (firmId) {
      return allTemplates.filter((t) => t.firmId === firmId);
    }
    return allTemplates;
  },

  async getTemplate(id: string): Promise<Template | undefined> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("templates")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return data ? mapDbToTemplate(data) : undefined;
      } catch (err: any) {
        console.warn("Supabase getTemplate failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id);
  },

  async createTemplate(template: Template): Promise<Template> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("templates").insert(mapTemplateToDb(template));
        if (error) throw error;
        return template;
      } catch (err: any) {
        console.warn("Supabase createTemplate failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const templates = readJSON<Template[]>(TEMPLATES_FILE, []);
    templates.push(template);
    writeJSON(TEMPLATES_FILE, templates);
    return template;
  },

  async updateTemplate(id: string, updated: Partial<Template>): Promise<Template | null> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const dbPayload: any = {};
        if (updated.name !== undefined) dbPayload.name = updated.name;
        if (updated.description !== undefined) dbPayload.description = updated.description;
        if (updated.categoryId !== undefined) dbPayload.category_id = updated.categoryId;
        if (updated.filePath !== undefined) dbPayload.file_path = updated.filePath;
        if (updated.placeholders !== undefined) dbPayload.placeholders = updated.placeholders;
        if (updated.isArchived !== undefined) dbPayload.is_archived = updated.isArchived;
        if (updated.brandingMode !== undefined) dbPayload.branding_mode = updated.brandingMode;
        dbPayload.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("templates")
          .update(dbPayload)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return mapDbToTemplate(data);
      } catch (err: any) {
        console.warn("Supabase updateTemplate failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const templates = readJSON<Template[]>(TEMPLATES_FILE, []);
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updated, updatedAt: new Date().toISOString() };
      writeJSON(TEMPLATES_FILE, templates);
      return templates[index];
    }
    return null;
  },

  async deleteTemplate(id: string): Promise<boolean> {
    await ensureDbConnected();
    const template = await this.getTemplate(id);
    if (!template) return false;

    if (isSupabaseEnabled && supabase) {
      try {
        // Delete from Storage if it exists
        if (template.filePath.startsWith("supabase://")) {
          try {
            const parsed = template.filePath.replace("supabase://", "");
            const slashIdx = parsed.indexOf("/");
            const bucket = parsed.substring(0, slashIdx);
            const key = parsed.substring(slashIdx + 1);
            await supabase.storage.from(bucket).remove([key]);
          } catch (err) {
            console.error("Failed to delete template from Supabase Storage:", err);
          }
        }

        const { error } = await supabase.from("templates").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.warn("Supabase deleteTemplate failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }

    if (fs.existsSync(template.filePath)) {
      try {
        fs.unlinkSync(template.filePath);
      } catch (err) {
        console.error("Error deleting physical template file:", err);
      }
    }
    const templates = readJSON<Template[]>(TEMPLATES_FILE, []);
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates.splice(index, 1);
      writeJSON(TEMPLATES_FILE, templates);
      return true;
    }
    return false;
  },

  // Documents
  async getDocuments(firmId?: string): Promise<GeneratedDocument[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("documents").select("*").order("created_at", { ascending: false });
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToDocument);
      } catch (err: any) {
        console.warn("Supabase getDocuments failed, falling back to JSON:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allDocs = readJSON<GeneratedDocument[]>(DOCUMENTS_FILE, []);
    if (firmId) {
      return allDocs.filter((d) => d.firmId === firmId);
    }
    return allDocs;
  },

  async getDocument(id: string): Promise<GeneratedDocument | undefined> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return data ? mapDbToDocument(data) : undefined;
      } catch (err: any) {
        console.warn("Supabase getDocument failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const docs = await this.getDocuments();
    return docs.find((d) => d.id === id);
  },

  async createDocument(doc: GeneratedDocument): Promise<GeneratedDocument> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("documents").insert(mapDocumentToDb(doc));
        if (error) throw error;
        return doc;
      } catch (err: any) {
        console.warn("Supabase createDocument failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const docs = readJSON<GeneratedDocument[]>(DOCUMENTS_FILE, []);
    docs.push(doc);
    writeJSON(DOCUMENTS_FILE, docs);
    return doc;
  },

  async updateDocument(id: string, updated: Partial<GeneratedDocument>): Promise<GeneratedDocument | null> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const dbPayload: any = {};
        if (updated.documentNumber !== undefined) dbPayload.document_number = updated.documentNumber;
        if (updated.templateId !== undefined) dbPayload.template_id = updated.templateId;
        if (updated.templateName !== undefined) dbPayload.template_name = updated.templateName;
        if (updated.categoryId !== undefined) dbPayload.category_id = updated.categoryId;
        if (updated.categoryName !== undefined) dbPayload.category_name = updated.categoryName;
        if (updated.generatedBy !== undefined) dbPayload.generated_by = updated.generatedBy;
        if (updated.values !== undefined) dbPayload.values = updated.values;
        if (updated.docxPath !== undefined) dbPayload.docx_path = updated.docxPath;
        if (updated.htmlPath !== undefined) dbPayload.html_path = updated.htmlPath;
        if (updated.pdfPath !== undefined) dbPayload.pdf_path = updated.pdfPath;

        const { data, error } = await supabase
          .from("documents")
          .update(dbPayload)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return mapDbToDocument(data);
      } catch (err: any) {
        console.warn("Supabase updateDocument failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const docs = readJSON<GeneratedDocument[]>(DOCUMENTS_FILE, []);
    const index = docs.findIndex((d) => d.id === id);
    if (index !== -1) {
      docs[index] = { ...docs[index], ...updated };
      writeJSON(DOCUMENTS_FILE, docs);
      return docs[index];
    }
    return null;
  },

  async getNextDocumentNumber(firmId?: string): Promise<string> {
    const settings = await this.getSettings(firmId);
    const docs = await this.getDocuments(firmId);
    const count = docs.length + 1;
    const year = new Date().getFullYear().toString();

    let pattern = settings.documentNumberPattern || "DOC-[YYYY]-000[COUNT]";
    pattern = pattern.replace("[YYYY]", year);

    const countRegex = /0*\[COUNT\]/;
    const match = pattern.match(countRegex);
    if (match) {
      const padLength = match[0].length - 7;
      const paddedCount = count.toString().padStart(Math.max(1, padLength + 1), "0");
      pattern = pattern.replace(countRegex, paddedCount);
    } else {
      pattern = pattern + count;
    }

    return pattern;
  },

  // Audit Logs
  async getAuditLogs(firmId?: string): Promise<AuditLog[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false });
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToAuditLog);
      } catch (err: any) {
        console.warn("Supabase getAuditLogs failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allLogs = readJSON<AuditLog[]>(AUDIT_LOGS_FILE, []);
    if (firmId) {
      return allLogs.filter((l) => l.firmId === firmId);
    }
    return allLogs;
  },

  async createAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    await ensureDbConnected();
    const fullLog: AuditLog = {
      ...log,
      id: "log-" + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("audit_logs").insert(mapAuditLogToDb(fullLog));
        if (error) throw error;
        return fullLog;
      } catch (err: any) {
        console.warn("Supabase createAuditLog failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const logs = readJSON<AuditLog[]>(AUDIT_LOGS_FILE, []);
    logs.unshift(fullLog);
    writeJSON(AUDIT_LOGS_FILE, logs);
    return fullLog;
  },

  // Settings
  async getSettings(firmId?: string): Promise<OrganizationSettings> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("settings").select("*");
        if (firmId) {
          query.eq("firm_id", firmId);
        } else {
          query.eq("id", "system-settings");
        }
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (data) {
          return mapDbToSettings(data);
        }
        let orgName = "Apex Enterprise Solutions";
        if (firmId) {
          const firm = await this.getFirm(firmId);
          if (firm) orgName = firm.name;
        }
        return { ...DEFAULT_SETTINGS, organizationName: orgName, firmId };
      } catch (err: any) {
        console.warn("Supabase getSettings failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const content = readJSON<any>(SETTINGS_FILE, DEFAULT_SETTINGS);
    if (Array.isArray(content)) {
      const found = content.find(s => s.firmId === firmId);
      if (found) return found;
    } else {
      // It's a single object, return it if they want firm-default, or migrate
      if (!firmId || firmId === "firm-default") {
        return { ...content, firmId: "firm-default" };
      }
    }
    let orgName = "Apex Enterprise Solutions";
    if (firmId) {
      const firm = await this.getFirm(firmId);
      if (firm) orgName = firm.name;
    }
    return { ...DEFAULT_SETTINGS, organizationName: orgName, firmId };
  },

  async updateSettings(settings: OrganizationSettings): Promise<OrganizationSettings> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const id = settings.firmId ? `settings-${settings.firmId}` : "system-settings";
        const { error } = await supabase
          .from("settings")
          .upsert({
            ...mapSettingsToDb(settings),
            id,
          });
        if (error) throw error;
        return settings;
      } catch (err: any) {
        console.warn("Supabase updateSettings failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    let content = readJSON<any>(SETTINGS_FILE, DEFAULT_SETTINGS);
    if (!Array.isArray(content)) {
      content = [{ ...content, firmId: "firm-default" }];
    }
    const idx = content.findIndex((s: any) => s.firmId === settings.firmId);
    if (idx !== -1) {
      content[idx] = settings;
    } else {
      content.push(settings);
    }
    writeJSON(SETTINGS_FILE, content);
    return settings;
  },

  // Organization Profiles
  async getOrganizationProfiles(firmId?: string): Promise<OrganizationProfile[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const query = supabase.from("organization_profiles").select("*").order("name");
        if (firmId) {
          query.eq("firm_id", firmId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapDbToProfile);
      } catch (err: any) {
        console.warn("Supabase getOrganizationProfiles failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const allProfiles = readJSON<OrganizationProfile[]>(ORG_PROFILES_FILE, []);
    if (firmId) {
      return allProfiles.filter((p) => p.firmId === firmId);
    }
    return allProfiles;
  },

  async getOrganizationProfile(id: string): Promise<OrganizationProfile | undefined> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("organization_profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return data ? mapDbToProfile(data) : undefined;
      } catch (err: any) {
        console.warn("Supabase getOrganizationProfile failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const profiles = await this.getOrganizationProfiles();
    return profiles.find((p) => p.id === id);
  },

  async createOrganizationProfile(profile: Omit<OrganizationProfile, "id" | "createdAt">): Promise<OrganizationProfile> {
    await ensureDbConnected();
    const newProfile: OrganizationProfile = {
      ...profile,
      id: "prof-" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("organization_profiles").insert(mapProfileToDb(newProfile));
        if (error) throw error;
        return newProfile;
      } catch (err: any) {
        console.warn("Supabase createOrganizationProfile failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const profiles = readJSON<OrganizationProfile[]>(ORG_PROFILES_FILE, []);
    profiles.push(newProfile);
    writeJSON(ORG_PROFILES_FILE, profiles);
    return newProfile;
  },

  async updateOrganizationProfile(id: string, updated: Partial<OrganizationProfile>): Promise<OrganizationProfile | null> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        // Map keys to snake_case
        const dbPayload: any = {};
        if (updated.name !== undefined) dbPayload.name = updated.name;
        if (updated.organizationName !== undefined) dbPayload.organization_name = updated.organizationName;
        if (updated.logo !== undefined) dbPayload.logo = updated.logo;
        if (updated.address !== undefined) dbPayload.address = updated.address;
        if (updated.contactNumber !== undefined) dbPayload.contact_number = updated.contactNumber;
        if (updated.email !== undefined) dbPayload.email = updated.email;
        if (updated.website !== undefined) dbPayload.website = updated.website;
        if (updated.gstNumber !== undefined) dbPayload.gst_number = updated.gstNumber;
        if (updated.panNumber !== undefined) dbPayload.pan_number = updated.panNumber;
        if (updated.footerText !== undefined) dbPayload.footer_text = updated.footerText;
        if (updated.authorizedSignatory !== undefined) dbPayload.authorized_signatory = updated.authorizedSignatory;
        if (updated.digitalSignature !== undefined) dbPayload.digital_signature = updated.digitalSignature;
        if (updated.headerDesign !== undefined) dbPayload.header_design = updated.headerDesign;
        if (updated.footerDesign !== undefined) dbPayload.footer_design = updated.footerDesign;
        if (updated.letterheadBackground !== undefined) dbPayload.letterhead_background = updated.letterheadBackground;

        const { data, error } = await supabase
          .from("organization_profiles")
          .update(dbPayload)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return mapDbToProfile(data);
      } catch (err: any) {
        console.warn("Supabase updateOrganizationProfile failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const profiles = readJSON<OrganizationProfile[]>(ORG_PROFILES_FILE, []);
    const index = profiles.findIndex((p) => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updated };
      writeJSON(ORG_PROFILES_FILE, profiles);
      return profiles[index];
    }
    return null;
  },

  async deleteOrganizationProfile(id: string): Promise<boolean> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("organization_profiles").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.warn("Supabase deleteOrganizationProfile failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const profiles = readJSON<OrganizationProfile[]>(ORG_PROFILES_FILE, []);
    const index = profiles.findIndex((p) => p.id === id);
    if (index !== -1) {
      profiles.splice(index, 1);
      writeJSON(ORG_PROFILES_FILE, profiles);
      return true;
    }
    return false;
  },

  async seedFirmData(firmId: string, firmName: string): Promise<void> {
    // 1. Seed Categories
    const categoriesToCreate: Category[] = DEFAULT_CATEGORIES.map(c => ({
      ...c,
      id: `cat-${firmId}-${Math.random().toString(36).substring(2, 7)}`,
      firmId,
      createdAt: new Date().toISOString()
    }));
    for (const cat of categoriesToCreate) {
      await this.createCategory(cat);
    }

    // 2. Seed Dropdowns
    const dropdownsToCreate: DropdownMaster[] = DEFAULT_DROPDOWNS.map(d => ({
      ...d,
      id: `dd-${firmId}-${Math.random().toString(36).substring(2, 7)}`,
      firmId,
      createdAt: new Date().toISOString()
    }));
    for (const dd of dropdownsToCreate) {
      await this.createDropdown(dd);
    }

    // 3. Seed Profile
    const profileToCreate: Omit<OrganizationProfile, "id" | "createdAt"> = {
      name: "Default Firm Profile",
      organizationName: firmName,
      address: "101, Business Street, City, Country",
      contactNumber: "",
      email: "",
      website: "",
      gstNumber: "",
      panNumber: "",
      footerText: `${firmName} - Generated Document`,
      authorizedSignatory: "Administrator",
      headerDesign: "standard",
      footerDesign: "standard",
      firmId,
    };
    await this.createOrganizationProfile(profileToCreate);

    // 4. Seed Settings
    const settingsToCreate: OrganizationSettings = {
      ...DEFAULT_SETTINGS,
      organizationName: firmName,
      firmId,
    };
    await this.updateSettings(settingsToCreate);
  },

  // Template User Access
  async getTemplateUserAccess(templateId: string): Promise<TemplateUserAccess[]> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("template_user_access")
          .select("*")
          .eq("template_id", templateId);
        if (error) throw error;
        return (data || []).map(mapDbToTemplateAccess);
      } catch (err: any) {
        console.warn("Supabase getTemplateUserAccess failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const accessList = readJSON<TemplateUserAccess[]>(TEMPLATE_ACCESS_FILE, []);
    return accessList.filter((a) => a.templateId === templateId);
  },

  async setTemplateUserAccess(templateId: string, firmId: string, userIds: string[], assignedByUserId: string): Promise<void> {
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        // First delete existing ones for this template
        const { error: deleteError } = await supabase
          .from("template_user_access")
          .delete()
          .eq("template_id", templateId);
        if (deleteError) throw deleteError;

        if (userIds.length > 0) {
          const insertPayloads = userIds.map((uId) => {
            const access: TemplateUserAccess = {
              id: "tua-" + Math.random().toString(36).substring(2, 11),
              firmId,
              templateId,
              userId: uId,
              assignedBy: assignedByUserId,
              createdAt: new Date().toISOString(),
            };
            return mapTemplateAccessToDb(access);
          });
          const { error: insertError } = await supabase
            .from("template_user_access")
            .insert(insertPayloads);
          if (insertError) throw insertError;
        }
        return;
      } catch (err: any) {
        console.warn("Supabase setTemplateUserAccess failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    // File fallback:
    let accessList = readJSON<TemplateUserAccess[]>(TEMPLATE_ACCESS_FILE, []);
    // filter out existing ones for this template
    accessList = accessList.filter((a) => a.templateId !== templateId);
    
    // add new ones
    userIds.forEach((uId) => {
      accessList.push({
        id: "tua-" + Math.random().toString(36).substring(2, 11),
        firmId,
        templateId,
        userId: uId,
        assignedBy: assignedByUserId,
        createdAt: new Date().toISOString(),
      });
    });
    
    writeJSON(TEMPLATE_ACCESS_FILE, accessList);
  },

  async hasTemplateAccess(templateId: string, userId: string, role: string, firmId?: string): Promise<boolean> {
    // If Super Admin, always has access
    if (role === "super_admin") return true;

    // Firm Admin always has access to their firm's templates
    const template = await this.getTemplate(templateId);
    if (!template) return false;

    // Must be same firm if not super admin
    if (firmId && template.firmId && template.firmId !== firmId) {
      return false;
    }

    if (role === "firm_admin") {
      return true;
    }

    // Normal user:
    await ensureDbConnected();
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("template_user_access")
          .select("id")
          .eq("template_id", templateId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        return !!data;
      } catch (err: any) {
        console.warn("Supabase hasTemplateAccess failed, falling back to local database:", err.message || err);
        isSupabaseEnabled = false;
      }
    }
    const accessList = readJSON<TemplateUserAccess[]>(TEMPLATE_ACCESS_FILE, []);
    return accessList.some((a) => a.templateId === templateId && a.userId === userId);
  }
};

