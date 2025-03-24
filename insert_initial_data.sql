-- Insert services if they don't exist
INSERT INTO services (name, description)
SELECT 'Plumbing', 'Plumbing installation, repair, and maintenance services'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Plumbing');

INSERT INTO services (name, description)
SELECT 'Electrical', 'Electrical installation, repair, and maintenance services'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Electrical');

INSERT INTO services (name, description)
SELECT 'Carpentry', 'Woodworking, furniture repair, and general carpentry services'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Carpentry');

INSERT INTO services (name, description)
SELECT 'Painting', 'Interior and exterior painting services'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Painting');

INSERT INTO services (name, description)
SELECT 'HVAC', 'Heating, ventilation, and air conditioning services'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'HVAC');