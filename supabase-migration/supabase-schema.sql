-- Supabase schema for Help Desk SaaS application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'agent', 'customer');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'past_due', 'unpaid', 'trial');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'on_hold', 'pending', 'resolved', 'archived');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tables

-- SuperAdmins table
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  admin_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  subdomain TEXT UNIQUE,
  custom_url TEXT UNIQUE,
  max_users INTEGER DEFAULT 5,
  current_users INTEGER DEFAULT 0,
  subscription_tier TEXT,
  subscription_status subscription_status DEFAULT 'inactive',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  organization_name TEXT NOT NULL,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'active',
  subscription_status subscription_status DEFAULT 'inactive',
  subscription_tier TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update organizations with admin_id foreign key
ALTER TABLE organizations 
ADD CONSTRAINT fk_admin_id 
FOREIGN KEY (admin_id) REFERENCES admins(id);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  organization_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES admins(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform branding table
CREATE TABLE platform_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  background_color TEXT DEFAULT '#ffffff',
  sidebar_color TEXT DEFAULT '#f8f9fa',
  content_font_color TEXT DEFAULT '#333333',
  sidebar_font_color TEXT DEFAULT '#333333',
  button_color TEXT DEFAULT '#4a6cf7',
  link_color TEXT DEFAULT '#4a6cf7',
  logo_url TEXT,
  favicon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization branding table
CREATE TABLE organization_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  background_color TEXT,
  sidebar_color TEXT,
  content_font_color TEXT,
  sidebar_font_color TEXT,
  button_color TEXT,
  link_color TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'General',
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket responses table
CREATE TABLE ticket_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_by_name TEXT,
  created_by_role user_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket attachments table
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  response_id UUID REFERENCES ticket_responses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Stripe config table
CREATE TABLE platform_stripe_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_mode BOOLEAN DEFAULT TRUE,
  test_publishable_key TEXT,
  test_secret_key TEXT,
  live_publishable_key TEXT,
  live_secret_key TEXT,
  webhook_secret TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing plans table
CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_users INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAQ table
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_email TEXT,
  user_role user_role,
  organization_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tickets_organization_id ON tickets(organization_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Create full text search indexes
ALTER TABLE tickets ADD COLUMN search_vector tsvector;
CREATE INDEX tickets_search_idx ON tickets USING GIN(search_vector);

CREATE OR REPLACE FUNCTION tickets_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_search_update_trigger
BEFORE INSERT OR UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION tickets_search_update();

-- Create functions for authentication
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user is a superadmin
  IF NEW.email LIKE '%@superadmin.com' THEN
    INSERT INTO super_admins (id, email, password, first_name, last_name, status)
    VALUES (NEW.id, NEW.email, NEW.encrypted_password, 'Super', 'Admin', 'active');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies
-- Enable Row Level Security
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stripe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for now, would need to be expanded in production)
-- Example policy for tickets
CREATE POLICY "Admins can view all tickets in their organization" 
ON tickets FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM admins WHERE organization_id = tickets.organization_id
  )
);

CREATE POLICY "Agents can view tickets in their organization" 
ON tickets FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE organization_id = tickets.organization_id AND role = 'agent'
  )
);

CREATE POLICY "Customers can view only their own tickets" 
ON tickets FOR SELECT 
USING (
  auth.uid() = tickets.created_by OR
  auth.uid() = tickets.assigned_to
);

-- Insert initial superadmin
INSERT INTO super_admins (email, password, first_name, last_name, status)
VALUES ('admin@helpdesk.com', crypt('admin123', gen_salt('bf')), 'System', 'Admin', 'active');

-- Insert initial platform branding
INSERT INTO platform_branding (background_color, sidebar_color, content_font_color, sidebar_font_color, button_color, link_color)
VALUES ('#ffffff', '#f8f9fa', '#333333', '#333333', '#4a6cf7', '#4a6cf7');
