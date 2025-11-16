-- SmartBoitage PRO - Production Admin Setup
-- This script creates the production admin account and removes test accounts

-- Create admin account for Aurelie
-- Password: Admin2024! (change this after first login via profile page)
-- Password hash generated with bcrypt
INSERT INTO users (email, nom, password_hash, role, actif)
VALUES (
    'Aurelie@2a-immobilier.fr',
    'Aurélie',
    '$2a$10$zCHMVDOJVf/SKiNk0i513.rFX72adStlP9zkRWLVhRF6SUrV.aXPy',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    actif = true,
    password_hash = EXCLUDED.password_hash;

-- Deactivate test accounts
UPDATE users SET actif = false
WHERE email IN (
    'admin@smartboitage.fr',
    'commercial1@smartboitage.fr',
    'commercial2@smartboitage.fr'
);

SELECT 'Production admin account created successfully!' as status;
SELECT 'Email: Aurelie@2a-immobilier.fr' as login_email;
SELECT 'Password: Admin2024! (CHANGE IMMEDIATELY)' as login_password;
