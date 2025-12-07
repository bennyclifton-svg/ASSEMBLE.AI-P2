-- Seed data for Cost Plan feature
-- Creates companies and cost lines matching the Excel sample layout

-- First, clean up existing cost plan data for default-project
DELETE FROM invoices WHERE project_id = 'default-project';
DELETE FROM variations WHERE project_id = 'default-project';
DELETE FROM cost_line_allocations WHERE cost_line_id IN (SELECT id FROM cost_lines WHERE project_id = 'default-project');
DELETE FROM cost_line_comments WHERE cost_line_id IN (SELECT id FROM cost_lines WHERE project_id = 'default-project');
DELETE FROM cost_lines WHERE project_id = 'default-project';

-- Create Companies
INSERT OR IGNORE INTO companies (id, name, abn, contact_name, contact_email, created_at, updated_at) VALUES
('company-lsl', 'LSL CORP.', '12 345 678 901', 'John Smith', 'john@lslcorp.com', datetime('now'), datetime('now')),
('company-ryde', 'Ryde Council', '98 765 432 100', 'Council Admin', 'admin@ryde.nsw.gov.au', datetime('now'), datetime('now')),
('company-nsw', 'NSW GOV.', '51 234 567 890', 'State Admin', 'info@nsw.gov.au', datetime('now'), datetime('now')),
('company-engine', 'Engine Room VM', '45 678 901 234', 'Sarah Lee', 'sarah@engineroomvm.com', datetime('now'), datetime('now')),
('company-compass', 'Compass-Intell', '78 901 234 567', 'Mike Brown', 'mike@compassintell.com', datetime('now'), datetime('now')),
('company-tbc', 'TBC', NULL, NULL, NULL, datetime('now'), datetime('now'));

-- FEES AND CHARGES (Section 1.xx)
INSERT INTO cost_lines (id, project_id, company_id, section, cost_code, description, reference, budget_cents, approved_contract_cents, sort_order, created_at, updated_at) VALUES
('cl-1-01', 'default-project', 'company-lsl', 'FEES', '1.01', 'Legal and Admin Fees', NULL, 2500000, 2350000, 0, datetime('now'), datetime('now')),
('cl-1-02', 'default-project', 'company-ryde', 'FEES', '1.02', 'Development Application', NULL, 8500000, 8250000, 1, datetime('now'), datetime('now')),
('cl-1-03', 'default-project', 'company-nsw', 'FEES', '1.03', 'Certification Fees', NULL, 1500000, 1450000, 2, datetime('now'), datetime('now'));

-- CONSULTANTS (Section 2.xx)
INSERT INTO cost_lines (id, project_id, company_id, section, cost_code, description, reference, budget_cents, approved_contract_cents, sort_order, created_at, updated_at) VALUES
('cl-2-01', 'default-project', 'company-lsl', 'CONSULTANTS', '2.01', 'Project Manager', NULL, 15000000, 14500000, 0, datetime('now'), datetime('now')),
('cl-2-02', 'default-project', 'company-engine', 'CONSULTANTS', '2.02', 'Architect', NULL, 45000000, 43500000, 1, datetime('now'), datetime('now')),
('cl-2-03', 'default-project', 'company-compass', 'CONSULTANTS', '2.03', 'Structural Engineer', NULL, 12000000, 11800000, 2, datetime('now'), datetime('now')),
('cl-2-04', 'default-project', 'company-tbc', 'CONSULTANTS', '2.04', 'Civil Engineer', NULL, 8500000, 0, 3, datetime('now'), datetime('now')),
('cl-2-05', 'default-project', 'company-tbc', 'CONSULTANTS', '2.05', 'Mechanical Engineer', NULL, 9500000, 0, 4, datetime('now'), datetime('now')),
('cl-2-06', 'default-project', 'company-tbc', 'CONSULTANTS', '2.06', 'Electrical Engineer', NULL, 7500000, 0, 5, datetime('now'), datetime('now')),
('cl-2-07', 'default-project', 'company-tbc', 'CONSULTANTS', '2.07', 'Fire Engineer', NULL, 4500000, 0, 6, datetime('now'), datetime('now')),
('cl-2-08', 'default-project', 'company-tbc', 'CONSULTANTS', '2.08', 'Hydraulic Engineer', NULL, 3500000, 0, 7, datetime('now'), datetime('now')),
('cl-2-09', 'default-project', 'company-tbc', 'CONSULTANTS', '2.09', 'Acoustic Engineer', NULL, 2500000, 0, 8, datetime('now'), datetime('now')),
('cl-2-10', 'default-project', 'company-tbc', 'CONSULTANTS', '2.10', 'Landscape Architect', NULL, 6000000, 0, 9, datetime('now'), datetime('now')),
('cl-2-11', 'default-project', 'company-tbc', 'CONSULTANTS', '2.11', 'Surveyor', NULL, 3000000, 0, 10, datetime('now'), datetime('now')),
('cl-2-12', 'default-project', 'company-compass', 'CONSULTANTS', '2.12', 'Quantity Surveyor', NULL, 5500000, 5200000, 11, datetime('now'), datetime('now')),
('cl-2-13', 'default-project', 'company-tbc', 'CONSULTANTS', '2.13', 'Town Planner', NULL, 4000000, 0, 12, datetime('now'), datetime('now'));

-- CONSTRUCTION (Section 3.xx)
INSERT INTO cost_lines (id, project_id, company_id, section, cost_code, description, reference, budget_cents, approved_contract_cents, sort_order, created_at, updated_at) VALUES
('cl-3-01', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.01', 'Demolition Works', NULL, 25000000, 0, 0, datetime('now'), datetime('now')),
('cl-3-02', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.02', 'Site Works', NULL, 35000000, 0, 1, datetime('now'), datetime('now')),
('cl-3-03', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.03', 'Substructure', NULL, 85000000, 0, 2, datetime('now'), datetime('now')),
('cl-3-04', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.04', 'Superstructure', NULL, 150000000, 0, 3, datetime('now'), datetime('now')),
('cl-3-05', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.05', 'External Envelope', NULL, 45000000, 0, 4, datetime('now'), datetime('now')),
('cl-3-06', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.06', 'Internal Finishes', NULL, 75000000, 0, 5, datetime('now'), datetime('now')),
('cl-3-07', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.07', 'Services', NULL, 120000000, 0, 6, datetime('now'), datetime('now')),
('cl-3-08', 'default-project', 'company-tbc', 'CONSTRUCTION', '3.08', 'External Works', NULL, 30000000, 0, 7, datetime('now'), datetime('now'));

-- CONTINGENCY (Section 4.xx)
INSERT INTO cost_lines (id, project_id, company_id, section, cost_code, description, reference, budget_cents, approved_contract_cents, sort_order, created_at, updated_at) VALUES
('cl-4-01', 'default-project', NULL, 'CONTINGENCY', '4.01', 'Project Contingency', NULL, 50000000, 0, 0, datetime('now'), datetime('now'));

-- Add some sample variations to show the VARIATIONS columns working
INSERT OR IGNORE INTO variations (id, project_id, cost_line_id, variation_number, category, description, status, amount_forecast_cents, amount_approved_cents, date_submitted, created_at, updated_at) VALUES
('var-001', 'default-project', 'cl-2-01', 'PV-001', 'Principal', 'Additional PM services for extended program', 'Approved', 150000, 150000, '2024-11-15', datetime('now'), datetime('now')),
('var-002', 'default-project', 'cl-2-02', 'PV-002', 'Principal', 'Design amendments - façade changes', 'Forecast', 350000, 0, '2024-11-20', datetime('now'), datetime('now')),
('var-003', 'default-project', 'cl-2-03', 'PV-003', 'Principal', 'Structural redesign for basement', 'Approved', 125000, 125000, '2024-11-10', datetime('now'), datetime('now'));

-- Add some sample invoices to show Claimed to Date working
INSERT OR IGNORE INTO invoices (id, project_id, cost_line_id, company_id, invoice_date, invoice_number, description, amount_cents, gst_cents, period_year, period_month, paid_status, created_at, updated_at) VALUES
('inv-001', 'default-project', 'cl-2-01', 'company-lsl', '2024-10-15', 'LSL-001', 'PM Fee October 2024', 2500000, 250000, 2024, 10, 'paid', datetime('now'), datetime('now')),
('inv-002', 'default-project', 'cl-2-01', 'company-lsl', '2024-11-15', 'LSL-002', 'PM Fee November 2024', 2500000, 250000, 2024, 11, 'paid', datetime('now'), datetime('now')),
('inv-003', 'default-project', 'cl-2-01', 'company-lsl', '2024-12-15', 'LSL-003', 'PM Fee December 2024', 2500000, 250000, 2024, 12, 'unpaid', datetime('now'), datetime('now')),
('inv-004', 'default-project', 'cl-2-02', 'company-engine', '2024-10-20', 'ERM-001', 'Architect Fee October 2024', 5000000, 500000, 2024, 10, 'paid', datetime('now'), datetime('now')),
('inv-005', 'default-project', 'cl-2-02', 'company-engine', '2024-11-20', 'ERM-002', 'Architect Fee November 2024', 5000000, 500000, 2024, 11, 'paid', datetime('now'), datetime('now')),
('inv-006', 'default-project', 'cl-2-02', 'company-engine', '2024-12-20', 'ERM-003', 'Architect Fee December 2024', 5000000, 500000, 2024, 12, 'unpaid', datetime('now'), datetime('now')),
('inv-007', 'default-project', 'cl-1-01', 'company-lsl', '2024-11-01', 'LSL-LEGAL-001', 'Legal fees', 1500000, 150000, 2024, 11, 'paid', datetime('now'), datetime('now')),
('inv-008', 'default-project', 'cl-1-02', 'company-ryde', '2024-10-05', 'RYDE-DA-001', 'DA Fee', 8250000, 825000, 2024, 10, 'paid', datetime('now'), datetime('now')),
('inv-009', 'default-project', 'cl-2-03', 'company-compass', '2024-11-25', 'CI-001', 'Structural Design Phase 1', 3500000, 350000, 2024, 11, 'paid', datetime('now'), datetime('now')),
('inv-010', 'default-project', 'cl-2-03', 'company-compass', '2024-12-20', 'CI-002', 'Structural Design Phase 2', 3000000, 300000, 2024, 12, 'unpaid', datetime('now'), datetime('now'));

-- Update the project to set current report month
UPDATE projects SET current_report_month = '2024-12-01', revision = 'REV A' WHERE id = 'default-project';
