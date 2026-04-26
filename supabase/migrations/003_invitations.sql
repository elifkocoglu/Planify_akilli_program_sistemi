CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT,
  code TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'staff',
  max_uses INT DEFAULT 1,
  use_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT email_or_code_required CHECK (
    email IS NOT NULL OR code IS NOT NULL
  )
);

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_invitations_institution ON invitations(institution_id);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- super_admin her şeyi görür
CREATE POLICY "super_admin tümünü görür" ON invitations
  FOR ALL USING (get_my_role() = 'super_admin');

-- institution_admin kendi kurumunu yönetir
CREATE POLICY "institution_admin kendi kurumunu yönetir" ON invitations
  FOR ALL USING (
    get_my_role() = 'institution_admin' AND
    institution_id = get_my_institution()
  );

-- department_admin kendi departmanı için davet oluşturabilir
CREATE POLICY "department_admin davet oluşturur" ON invitations
  FOR ALL USING (
    get_my_role() = 'department_admin' AND
    institution_id = get_my_institution() AND
    department_id = ANY(get_my_departments())
  );
