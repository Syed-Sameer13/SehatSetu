-- ==============================================================================
-- SehatSetu Synthetic Seed Data (Demo & Testing)
-- ==============================================================================

-- Seed Clinical Departments
INSERT INTO departments (id, code, name, description)
VALUES 
    ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'EMERGENCY', 'Emergency Department (ER)', 'Immediate acute stabilization and critical triage unit'),
    ('a2c3d4e5-1111-2222-3333-444455556666', 'GEN_MED', 'General Medicine (OPD)', 'Outpatient consultations for acute and chronic internal illnesses'),
    ('b3c4d5e6-2222-3333-4444-555566667777', 'PEDIATRICS', 'Pediatrics Unit', 'Child and adolescent clinical care')
ON CONFLICT (code) DO NOTHING;

-- Seed Synthetic Demo Patients
INSERT INTO patients (id, uhid, full_name, age, gender, phone_number, address)
VALUES 
    ('c1f72a4e-1234-5678-9abc-def012345678', 'SS-2026-0001', 'Aarav Sharma', 48, 'MALE', '+91-9876543210', 'B-42, Sector 14, Noida, UP'),
    ('d2e83b5f-5678-9abc-def0-123456789abc', 'SS-2026-0002', 'Sunita Devi', 62, 'FEMALE', '+91-9876543211', 'Flat 102, Shanti Nagar, Lucknow, UP'),
    ('e3f94c6a-9abc-def0-1234-56789abcdef0', 'SS-2026-0003', 'Rajesh Patel', 35, 'MALE', '+91-9876543212', '12/4, Station Road, Ahmedabad, GJ')
ON CONFLICT (uhid) DO NOTHING;
