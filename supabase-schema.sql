-- ==========================================
-- SMART DOCUMENT GENERATOR - SUPABASE SCHEMA
-- ==========================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Firms Table
CREATE TABLE IF NOT EXISTS firms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    plan TEXT DEFAULT 'free_trial', -- 'free_trial', 'basic', 'pro', 'enterprise'
    status TEXT DEFAULT 'active', -- 'pending_verification', 'active', 'disabled'
    verification_token TEXT,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default firm for backward compatibility / default workspace
INSERT INTO firms (id, name, email, mobile, plan, status, is_verified, created_at)
VALUES 
('firm-default', 'Apex Enterprise Solutions', 'admin@apex.com', '+91 98765 43210', 'enterprise', 'active', true, NOW())
ON CONFLICT (id) DO NOTHING;


-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    firm_id TEXT REFERENCES firms(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT true,
    verification_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default users:
-- mayurdivate24 is the SuperAdmin (can view all firms, manage all firms)
-- user is the normal employee under firm-default
INSERT INTO users (id, username, name, email, role, password_hash, firm_id, is_verified, created_at)
VALUES 
('user-admin', 'mayurdivate24', 'Mayur Divate', 'admin@apex.com', 'SuperAdmin', 'oMsairaM@4', NULL, true, NOW()),
('user-regular', 'user', 'John Smith (User)', 'john@apex.com', 'User', 'user123', 'firm-default', true, NOW())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;


-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories for default firm
INSERT INTO categories (id, name, description, firm_id, created_at)
VALUES
('cat-1', 'Letters', 'Standard official letters & communication', 'firm-default', NOW()),
('cat-2', 'Certificates', 'Achievement, training, and completion awards', 'firm-default', NOW()),
('cat-3', 'HR Documents', 'Offer letters, appointment, and policy undertakings', 'firm-default', NOW()),
('cat-4', 'Legal & Contracts', 'Non-disclosure agreements, service level agreements', 'firm-default', NOW()),
('cat-5', 'Invoices & POs', 'Billing statements and purchase orders', 'firm-default', NOW())
ON CONFLICT (id) DO NOTHING;


-- 3. Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    placeholders JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT false,
    branding_mode TEXT DEFAULT 'none',
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    document_number TEXT NOT NULL,
    template_id TEXT,
    template_name TEXT NOT NULL,
    category_id TEXT,
    category_name TEXT NOT NULL,
    generated_by JSONB NOT NULL, -- { userId, name, email }
    values JSONB NOT NULL, -- key-value pairs of dynamic field entries
    docx_path TEXT NOT NULL,
    html_path TEXT DEFAULT '',
    pdf_path TEXT,
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 5. Organization Profiles Table
CREATE TABLE IF NOT EXISTS organization_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    logo TEXT, -- Base64 or URL
    address TEXT,
    contact_number TEXT,
    email TEXT,
    website TEXT,
    gst_number TEXT,
    pan_number TEXT,
    footer_text TEXT,
    authorized_signatory TEXT,
    digital_signature TEXT, -- Base64 or URL
    header_design TEXT DEFAULT 'standard',
    footer_design TEXT DEFAULT 'standard',
    letterhead_background TEXT,
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default organization profile
INSERT INTO organization_profiles (
    id, name, organization_name, logo, address, contact_number, email, website, 
    gst_number, pan_number, footer_text, authorized_signatory, digital_signature, 
    header_design, footer_design, letterhead_background, firm_id, created_at
) VALUES (
    'prof-1', 
    'Apex Corporate Profile', 
    'Apex Enterprise Solutions Ltd.', 
    '', 
    '101, Business Tower, Bandra Kurla Complex, Mumbai - 400051, India', 
    '+91 22 5555 1234', 
    'contact@apex.com', 
    'www.apexenterprise.com', 
    '27AAAAA1111A1Z1', 
    'AAAAA1111A', 
    'Apex Enterprise Solutions - Confidential and Proprietary Document', 
    'Jane Doe, Director of Operations', 
    '', 
    'standard', 
    'standard', 
    '', 
    'firm-default',
    NOW()
) ON CONFLICT (id) DO NOTHING;


-- 6. Dropdown Master Table
CREATE TABLE IF NOT EXISTS dropdown_master (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb, -- array of strings
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default dropdowns
INSERT INTO dropdown_master (id, name, options, firm_id, created_at)
VALUES
('dd-1', 'Designation', '["Director", "General Manager", "Engineering Lead", "Senior Developer", "HR Specialist", "Business Analyst"]'::jsonb, 'firm-default', NOW()),
('dd-2', 'Department', '["Engineering", "Human Resources", "Legal & Compliance", "Finance & Accounts", "Sales & Marketing"]'::jsonb, 'firm-default', NOW()),
('dd-3', 'Indian States', '["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Telangana"]'::jsonb, 'firm-default', NOW()),
('dd-4', 'US States', '["California", "New York", "Texas", "Florida", "Washington", "Illinois"]'::jsonb, 'firm-default', NOW()),
('dd-5', 'Project Type', '["Fixed Bid", "Time & Material", "Retainer", "Internal Research"]'::jsonb, 'firm-default', NOW())
ON CONFLICT (id) DO NOTHING;


-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 8. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL,
    address TEXT,
    logo TEXT,
    digital_signature TEXT,
    footer TEXT,
    default_margins JSONB,
    default_paper_size TEXT DEFAULT 'A4',
    document_number_pattern TEXT DEFAULT 'DOC-[YYYY]-000[COUNT]',
    timezone TEXT DEFAULT 'Asia/Kolkata (GMT+5:30)',
    language TEXT DEFAULT 'en',
    placeholder_syntax TEXT DEFAULT 'all',
    firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default settings
INSERT INTO settings (
    id, organization_name, address, logo, digital_signature, footer, 
    default_margins, default_paper_size, document_number_pattern, timezone, language, placeholder_syntax, firm_id, created_at
) VALUES (
    'system-settings',
    'Apex Enterprise Solutions',
    '404, Tech Park, Phase-II, Sector-V, Pune - 411057, India',
    '',
    '',
    'This is a computer-generated document. Confidentiality Guaranteed.',
    '{"top": 1, "bottom": 1, "left": 1, "right": 1}'::jsonb,
    'A4',
    'DOC-[YYYY]-000[COUNT]',
    'Asia/Kolkata (GMT+5:30)',
    'en',
    'all',
    'firm-default',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Template User Access Table
CREATE TABLE IF NOT EXISTS template_user_access (
    id VARCHAR(50) PRIMARY KEY,
    firm_id VARCHAR(50) NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (template_id, user_id)
);

