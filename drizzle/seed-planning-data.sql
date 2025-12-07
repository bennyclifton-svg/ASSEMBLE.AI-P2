-- Seed Consultant Disciplines for default-project
INSERT OR IGNORE INTO consultant_disciplines (id, project_id, discipline_name, is_enabled, "order") VALUES
('cd-arch', 'default-project', 'Architectural', 0, 1),
('cd-struct', 'default-project', 'Structural', 0, 2),
('cd-civil', 'default-project', 'Civil', 0, 3),
('cd-mep', 'default-project', 'MEP (Mech/Elec/Plumb)', 0, 4),
('cd-landscape', 'default-project', 'Landscape', 0, 5),
('cd-interior', 'default-project', 'Interior Design', 0, 6),
('cd-acoustic', 'default-project', 'Acoustic', 0, 7),
('cd-fire', 'default-project', 'Fire Safety', 0, 8),
('cd-access', 'default-project', 'Accessibility', 0, 9),
('cd-traffic', 'default-project', 'Traffic', 0, 10),
('cd-waste', 'default-project', 'Waste Management', 0, 11),
('cd-heritage', 'default-project', 'Heritage', 0, 12),
('cd-geotech', 'default-project', 'Geotechnical', 0, 13),
('cd-survey', 'default-project', 'Surveyor', 0, 14),
('cd-bca', 'default-project', 'BCA / Certifier', 0, 15);

-- Seed Contractor Trades for default-project
INSERT OR IGNORE INTO contractor_trades (id, project_id, trade_name, is_enabled, "order") VALUES
('ct-demo', 'default-project', 'Demolition', 0, 1),
('ct-excav', 'default-project', 'Excavation', 0, 2),
('ct-conc', 'default-project', 'Concrete', 0, 3),
('ct-brick', 'default-project', 'Bricklaying', 0, 4),
('ct-carp', 'default-project', 'Carpentry', 0, 5),
('ct-join', 'default-project', 'Joinery', 0, 6),
('ct-roof', 'default-project', 'Roofing', 0, 7),
('ct-win', 'default-project', 'Windows & Doors', 0, 8),
('ct-elec', 'default-project', 'Electrical', 0, 9),
('ct-plumb', 'default-project', 'Plumbing', 0, 10),
('ct-mech', 'default-project', 'Mechanical / HVAC', 0, 11),
('ct-fire', 'default-project', 'Fire Services', 0, 12),
('ct-plast', 'default-project', 'Plastering', 0, 13),
('ct-tile', 'default-project', 'Tiling', 0, 14),
('ct-paint', 'default-project', 'Painting', 0, 15),
('ct-floor', 'default-project', 'Flooring', 0, 16),
('ct-land', 'default-project', 'Landscaping', 0, 17),
('ct-water', 'default-project', 'Waterproofing', 0, 18),
('ct-metal', 'default-project', 'Metalwork', 0, 19),
('ct-glass', 'default-project', 'Glazing', 0, 20),
('ct-clean', 'default-project', 'Cleaning', 0, 21);

-- Seed Project Stages for default-project
INSERT OR IGNORE INTO project_stages (id, project_id, stage_number, stage_name, status) VALUES
('stage-1', 'default-project', 1, 'Initiation', 'not_started'),
('stage-2', 'default-project', 2, 'Scheme Design', 'not_started'),
('stage-3', 'default-project', 3, 'Detail Design', 'not_started'),
('stage-4', 'default-project', 4, 'Procurement', 'not_started'),
('stage-5', 'default-project', 5, 'Delivery', 'not_started');

-- Seed Project Details placeholder
INSERT OR IGNORE INTO project_details (id, project_id, project_name, address) VALUES
('pd-default', 'default-project', 'Default Project', '123 Example St, Sydney NSW 2000');

-- Seed Project Objectives placeholder
INSERT OR IGNORE INTO project_objectives (id, project_id) VALUES
('po-default', 'default-project');
