-- Migration: Standardize discipline/trade names
-- Removes "Engineer", "Consultant", "Designer", "Architect" suffixes
-- Exception: Keep "Fire Engineer" as is

-- ============================================
-- Update consultant_disciplines table
-- ============================================

UPDATE consultant_disciplines SET discipline_name = 'Hydraulic' WHERE discipline_name = 'Hydraulic Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Landscape' WHERE discipline_name IN ('Landscape Architect', 'Landscape Designer');
UPDATE consultant_disciplines SET discipline_name = 'Geotech' WHERE discipline_name IN ('Geotechnical Engineer', 'Geotech Engineer');
UPDATE consultant_disciplines SET discipline_name = 'Facade' WHERE discipline_name = 'Facade Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Traffic' WHERE discipline_name = 'Traffic Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Security' WHERE discipline_name = 'Security Consultant';
UPDATE consultant_disciplines SET discipline_name = 'Interior' WHERE discipline_name IN ('Interior Designer', 'Interior Design');
UPDATE consultant_disciplines SET discipline_name = 'Lighting' WHERE discipline_name IN ('Lighting Designer', 'Lighting Consultant');
UPDATE consultant_disciplines SET discipline_name = 'Acoustic' WHERE discipline_name IN ('Acoustic Consultant', 'Acoustic Engineer', 'Acoustics Consultant');
UPDATE consultant_disciplines SET discipline_name = 'Hazmat' WHERE discipline_name = 'Hazmat Consultant';
UPDATE consultant_disciplines SET discipline_name = 'Waterproofing' WHERE discipline_name = 'Waterproofing Consultant';
UPDATE consultant_disciplines SET discipline_name = 'Vertical Transport' WHERE discipline_name IN ('Vertical Transport Consultant', 'Lift Consultant');
UPDATE consultant_disciplines SET discipline_name = 'Signage' WHERE discipline_name = 'Signage Consultant';
UPDATE consultant_disciplines SET discipline_name = 'Structural' WHERE discipline_name = 'Structural Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Civil' WHERE discipline_name = 'Civil Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Mechanical' WHERE discipline_name = 'Mechanical Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Electrical' WHERE discipline_name = 'Electrical Engineer';
UPDATE consultant_disciplines SET discipline_name = 'ESD' WHERE discipline_name IN ('ESD Consultant', 'ESD Engineer');
UPDATE consultant_disciplines SET discipline_name = 'Wind' WHERE discipline_name = 'Wind Engineer';
UPDATE consultant_disciplines SET discipline_name = 'Flood' WHERE discipline_name IN ('Flood Engineer', 'Flooding Engineer', 'Hydraulic/Flooding Engineer');
UPDATE consultant_disciplines SET discipline_name = 'Town Planning' WHERE discipline_name IN ('Town Planner', 'Planning Consultant');
UPDATE consultant_disciplines SET discipline_name = 'Survey' WHERE discipline_name = 'Surveyor';
UPDATE consultant_disciplines SET discipline_name = 'Building Certifier' WHERE discipline_name = 'Certifier';
UPDATE consultant_disciplines SET discipline_name = 'Waste Management' WHERE discipline_name = 'Waste Consultant';
UPDATE consultant_disciplines SET discipline_name = 'Access' WHERE discipline_name IN ('Access Consultant', 'Accessibility Consultant');
UPDATE consultant_disciplines SET discipline_name = 'Bushfire' WHERE discipline_name IN ('Bushfire Consultant', 'BPAD Consultant');
UPDATE consultant_disciplines SET discipline_name = 'Arborist' WHERE discipline_name = 'Arborist Consultant';
UPDATE consultant_disciplines SET discipline_name = 'Ecology' WHERE discipline_name IN ('Ecology Consultant', 'Ecologist');

-- ============================================
-- Update project_stakeholders table (discipline_or_trade column)
-- ============================================

UPDATE project_stakeholders SET discipline_or_trade = 'Hydraulic' WHERE discipline_or_trade = 'Hydraulic Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Landscape' WHERE discipline_or_trade IN ('Landscape Architect', 'Landscape Designer');
UPDATE project_stakeholders SET discipline_or_trade = 'Geotech' WHERE discipline_or_trade IN ('Geotechnical Engineer', 'Geotech Engineer');
UPDATE project_stakeholders SET discipline_or_trade = 'Facade' WHERE discipline_or_trade = 'Facade Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Traffic' WHERE discipline_or_trade = 'Traffic Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Security' WHERE discipline_or_trade = 'Security Consultant';
UPDATE project_stakeholders SET discipline_or_trade = 'Interior' WHERE discipline_or_trade IN ('Interior Designer', 'Interior Design');
UPDATE project_stakeholders SET discipline_or_trade = 'Lighting' WHERE discipline_or_trade IN ('Lighting Designer', 'Lighting Consultant');
UPDATE project_stakeholders SET discipline_or_trade = 'Acoustic' WHERE discipline_or_trade IN ('Acoustic Consultant', 'Acoustic Engineer', 'Acoustics Consultant');
UPDATE project_stakeholders SET discipline_or_trade = 'Hazmat' WHERE discipline_or_trade = 'Hazmat Consultant';
UPDATE project_stakeholders SET discipline_or_trade = 'Waterproofing' WHERE discipline_or_trade = 'Waterproofing Consultant';
UPDATE project_stakeholders SET discipline_or_trade = 'Vertical Transport' WHERE discipline_or_trade IN ('Vertical Transport Consultant', 'Lift Consultant');
UPDATE project_stakeholders SET discipline_or_trade = 'Signage' WHERE discipline_or_trade = 'Signage Consultant';
UPDATE project_stakeholders SET discipline_or_trade = 'Structural' WHERE discipline_or_trade = 'Structural Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Civil' WHERE discipline_or_trade = 'Civil Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Mechanical' WHERE discipline_or_trade = 'Mechanical Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Electrical' WHERE discipline_or_trade = 'Electrical Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'ESD' WHERE discipline_or_trade IN ('ESD Consultant', 'ESD Engineer');
UPDATE project_stakeholders SET discipline_or_trade = 'Wind' WHERE discipline_or_trade = 'Wind Engineer';
UPDATE project_stakeholders SET discipline_or_trade = 'Flood' WHERE discipline_or_trade IN ('Flood Engineer', 'Flooding Engineer', 'Hydraulic/Flooding Engineer');
UPDATE project_stakeholders SET discipline_or_trade = 'Town Planning' WHERE discipline_or_trade IN ('Town Planner', 'Planning Consultant');
UPDATE project_stakeholders SET discipline_or_trade = 'Survey' WHERE discipline_or_trade = 'Surveyor';
UPDATE project_stakeholders SET discipline_or_trade = 'Building Certifier' WHERE discipline_or_trade = 'Certifier';
UPDATE project_stakeholders SET discipline_or_trade = 'Waste Management' WHERE discipline_or_trade = 'Waste Consultant';
UPDATE project_stakeholders SET discipline_or_trade = 'Access' WHERE discipline_or_trade IN ('Access Consultant', 'Accessibility Consultant');
UPDATE project_stakeholders SET discipline_or_trade = 'Bushfire' WHERE discipline_or_trade IN ('Bushfire Consultant', 'BPAD Consultant');
UPDATE project_stakeholders SET discipline_or_trade = 'Arborist' WHERE discipline_or_trade = 'Arborist Consultant';
UPDATE project_stakeholders SET discipline_or_trade = 'Ecology' WHERE discipline_or_trade IN ('Ecology Consultant', 'Ecologist');
UPDATE project_stakeholders SET discipline_or_trade = 'Demolition Consultant' WHERE discipline_or_trade = 'Demolition Consultant';

-- Map Services Engineer variants to their specific disciplines
UPDATE project_stakeholders SET discipline_or_trade = 'Mechanical' WHERE discipline_or_trade = 'Services Engineer (Mechanical)';
UPDATE project_stakeholders SET discipline_or_trade = 'Electrical' WHERE discipline_or_trade = 'Services Engineer (Electrical)';
UPDATE project_stakeholders SET discipline_or_trade = 'Hydraulic' WHERE discipline_or_trade = 'Services Engineer (Hydraulic)';
UPDATE project_stakeholders SET discipline_or_trade = 'Mechanical' WHERE discipline_or_trade = 'Services Engineer' AND discipline_or_trade NOT LIKE '%(%)%';

-- ============================================
-- Delete duplicate entries (keep the first one)
-- Run after the updates above
-- ============================================

-- Remove duplicate consultant_disciplines (keep lowest order)
DELETE FROM consultant_disciplines
WHERE id NOT IN (
    SELECT MIN(id)
    FROM consultant_disciplines
    GROUP BY project_id, discipline_name
);

-- Note: Fire Engineer is intentionally NOT updated per user request
-- If you need to standardize Fire Engineer to Fire Engineering, uncomment:
-- UPDATE consultant_disciplines SET discipline_name = 'Fire Engineering' WHERE discipline_name = 'Fire Engineer';
-- UPDATE project_stakeholders SET discipline_or_trade = 'Fire Engineering' WHERE discipline_or_trade = 'Fire Engineer';
