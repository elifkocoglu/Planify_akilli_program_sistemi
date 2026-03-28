-- ============================================================
-- 001_initial_schema.sql
-- Planify — İlk Veritabanı Şeması
-- ============================================================

-- ============================================================
-- 0. TEMİZLİK (yeniden çalıştırılabilirlik için)
-- ============================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS constraints CASCADE;
DROP TABLE IF EXISTS schedule_slots CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS admin_departments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS titles CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;

DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS swap_status CASCADE;
DROP TYPE IF EXISTS leave_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;
DROP TYPE IF EXISTS constraint_type CASCADE;
DROP TYPE IF EXISTS slot_status CASCADE;
DROP TYPE IF EXISTS schedule_status CASCADE;
DROP TYPE IF EXISTS period_type CASCADE;
DROP TYPE IF EXISTS schedule_type CASCADE;
DROP TYPE IF EXISTS room_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS institution_type CASCADE;

DROP FUNCTION IF EXISTS get_my_role() CASCADE;
DROP FUNCTION IF EXISTS get_my_institution() CASCADE;
DROP FUNCTION IF EXISTS get_my_departments() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ============================================================
-- 1. ENUM TİPLERİ
-- ============================================================

CREATE TYPE institution_type AS ENUM ('school', 'hospital', 'company');

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'institution_admin',
  'department_admin',
  'staff'
);

CREATE TYPE schedule_type AS ENUM ('duty', 'lesson');

CREATE TYPE period_type AS ENUM ('weekly', 'monthly');

CREATE TYPE schedule_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE slot_status AS ENUM ('active', 'swapped', 'cancelled');

CREATE TYPE leave_type AS ENUM (
  'annual', 'sick', 'unpaid', 'maternity', 'administrative'
);

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE swap_status AS ENUM (
  'pending',
  'approved_by_receiver',
  'approved_by_admin',
  'rejected'
);

CREATE TYPE notification_type AS ENUM (
  'schedule_published',
  'swap_request',
  'swap_approved',
  'swap_rejected',
  'leave_approved',
  'leave_rejected',
  'shift_changed'
);

CREATE TYPE constraint_type AS ENUM (
  'max_shifts_per_week',
  'max_shifts_per_month',
  'max_hours_per_week',
  'min_rest_hours',
  'no_consecutive_days',
  'unavailable_day',
  'unavailable_date',
  'unavailable_time',
  'required_title_per_shift',
  'min_staff_per_shift',
  'max_staff_per_shift',
  'not_together_shift',
  'must_together_shift',
  'teacher_no_overlap',
  'class_no_overlap',
  'custom'
);

CREATE TYPE room_type AS ENUM ('classroom', 'office', 'lab', 'other');

CREATE TYPE audit_action AS ENUM (
  'created', 'updated', 'deleted', 'published', 'approved', 'rejected'
);

-- ============================================================
-- 2. TABLOLAR
-- ============================================================

CREATE TABLE institutions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        institution_type NOT NULL,
  timezone    TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  settings    JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE titles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id        UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  min_required_per_shift INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           schedule_type NOT NULL DEFAULT 'duty',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  capacity       INT,
  type           room_type DEFAULT 'classroom',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- profiles.id → auth.users(id): Supabase yerleşik auth yapısı korunuyor
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id      UUID REFERENCES institutions(id) ON DELETE SET NULL,
  department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
  title_id            UUID REFERENCES titles(id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  role                user_role NOT NULL DEFAULT 'staff',
  weekly_max_hours    INT,
  monthly_max_shifts  INT,
  push_token          TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- department_admin birden fazla departman yönetebilir
CREATE TABLE admin_departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, department_id)
);

CREATE TABLE schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id  UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           schedule_type NOT NULL,
  period_type    period_type NOT NULL DEFAULT 'monthly',
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  status         schedule_status NOT NULL DEFAULT 'draft',
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  room_id       UUID REFERENCES rooms(id) ON DELETE SET NULL,
  title_id      UUID REFERENCES titles(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  day_of_week   INT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  status        slot_status NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE constraints (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id  UUID REFERENCES departments(id) ON DELETE CASCADE,
  staff_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type           constraint_type NOT NULL,
  value          JSONB NOT NULL DEFAULT '{}',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  type           leave_type NOT NULL DEFAULT 'annual',
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  reason         TEXT,
  status         leave_status NOT NULL DEFAULT 'pending',
  reviewed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE swap_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  receiver_slot_id  UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  status            swap_status NOT NULL DEFAULT 'pending',
  admin_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reject_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  type           notification_type NOT NULL,
  related_id     UUID,
  is_read        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  user_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action         audit_action NOT NULL,
  table_name     TEXT NOT NULL,
  record_id      UUID,
  old_value      JSONB,
  new_value      JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXLER (performans için)
-- ============================================================

CREATE INDEX idx_profiles_institution       ON profiles(institution_id);
CREATE INDEX idx_profiles_department        ON profiles(department_id);
CREATE INDEX idx_schedules_institution      ON schedules(institution_id);
CREATE INDEX idx_schedules_department       ON schedules(department_id);
CREATE INDEX idx_schedule_slots_schedule    ON schedule_slots(schedule_id);
CREATE INDEX idx_schedule_slots_staff       ON schedule_slots(staff_id);
CREATE INDEX idx_schedule_slots_date        ON schedule_slots(date);
CREATE INDEX idx_constraints_institution    ON constraints(institution_id);
CREATE INDEX idx_constraints_staff          ON constraints(staff_id);
CREATE INDEX idx_notifications_user         ON notifications(user_id);
CREATE INDEX idx_notifications_read         ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_institution     ON audit_logs(institution_id);
CREATE INDEX idx_leave_requests_staff       ON leave_requests(staff_id);
CREATE INDEX idx_swap_requests_requester    ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_receiver     ON swap_requests(receiver_id);
CREATE INDEX idx_admin_departments_profile  ON admin_departments(profile_id);

-- ============================================================
-- 4. PROFİL OTO-OLUŞTURMA TRİGGER'I
-- raw_user_meta_data boş gelebilir; tüm alanlar COALESCE ile
-- güvenli yazılıyor. Role cast başarısız olursa 'staff' default.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'İsimsiz'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'staff'
    )
  );
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- role cast hatası veya başka bir sorun olursa 'staff' ile tekrar dene
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'İsimsiz'),
    'staff'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE institutions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5a. YARDIMCI FONKSİYONLAR
-- NOT: Bu fonksiyonlar profiles tablosunu sorgular.
--      profiles tablosunun KENDİ politikalarında KULLANILMAZ
--      (sonsuz döngü önleme).
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_institution()
RETURNS UUID AS $$
  SELECT institution_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_departments()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(department_id)
  FROM admin_departments
  WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 5b. institutions politikaları
-- ============================================================

CREATE POLICY "institutions: super_admin tümünü görür" ON institutions
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "institutions: diğerleri kendi kurumunu görür" ON institutions
  FOR SELECT USING (id = get_my_institution());

-- ============================================================
-- 5c. profiles politikaları
-- UYARI: get_my_role() / get_my_institution() KULLANILMAZ →
--        sonsuz döngü riski. Sadece auth.uid() ve doğrudan
--        JOIN ile kontrol yapılır.
-- ============================================================

-- super_admin: kendi satırından role = 'super_admin' kontrol et (JOIN ile)
CREATE POLICY "profiles: super_admin tümünü görür" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- institution_admin: kendi kurumundaki profilleri yönetir
CREATE POLICY "profiles: institution_admin kendi kurumunu görür" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'institution_admin'
        AND p.institution_id = profiles.institution_id
    )
  );

-- department_admin: aynı kurumda, yönettiği departmandaki profiller
CREATE POLICY "profiles: department_admin kendi departmanını görür" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_departments ad ON ad.profile_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'department_admin'
        AND p.institution_id = profiles.institution_id
        AND ad.department_id = profiles.department_id
    )
  );

-- staff: yalnızca kendi profili
CREATE POLICY "profiles: staff kendi profilini görür" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: staff kendi profilini günceller" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- 5d. schedules politikaları
-- ============================================================

CREATE POLICY "schedules: super_admin tümünü görür" ON schedules
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "schedules: institution_admin kendi kurumunu yönetir" ON schedules
  FOR ALL USING (
    get_my_role() = 'institution_admin' AND
    institution_id = get_my_institution()
  );

CREATE POLICY "schedules: department_admin kendi departmanını yönetir" ON schedules
  FOR ALL USING (
    get_my_role() = 'department_admin' AND
    institution_id = get_my_institution() AND
    department_id = ANY(get_my_departments())
  );

CREATE POLICY "schedules: staff yayınlanan programları görür" ON schedules
  FOR SELECT USING (
    institution_id = get_my_institution() AND
    status = 'published'
  );

-- ============================================================
-- 5e. schedule_slots politikaları
-- ============================================================

CREATE POLICY "schedule_slots: super_admin tümünü görür" ON schedule_slots
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "schedule_slots: institution_admin kendi kurumunu yönetir" ON schedule_slots
  FOR ALL USING (
    get_my_role() = 'institution_admin' AND
    department_id IN (
      SELECT id FROM departments WHERE institution_id = get_my_institution()
    )
  );

CREATE POLICY "schedule_slots: department_admin kendi departmanını yönetir" ON schedule_slots
  FOR ALL USING (
    get_my_role() = 'department_admin' AND
    department_id = ANY(get_my_departments())
  );

CREATE POLICY "schedule_slots: staff kendi slotlarını görür" ON schedule_slots
  FOR SELECT USING (staff_id = auth.uid());

-- ============================================================
-- 5f. notifications politikaları
-- ============================================================

CREATE POLICY "notifications: herkes kendi bildirimlerini görür" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 5g. leave_requests politikaları
-- ============================================================

CREATE POLICY "leave_requests: super_admin tümünü görür" ON leave_requests
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "leave_requests: admin kendi kurumunu görür" ON leave_requests
  FOR ALL USING (
    get_my_role() IN ('institution_admin', 'department_admin') AND
    institution_id = get_my_institution()
  );

CREATE POLICY "leave_requests: staff kendi iznini görür" ON leave_requests
  FOR ALL USING (staff_id = auth.uid());

-- ============================================================
-- 5h. swap_requests politikaları
-- ============================================================

CREATE POLICY "swap_requests: super_admin tümünü görür" ON swap_requests
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "swap_requests: admin onay için görür" ON swap_requests
  FOR ALL USING (
    get_my_role() IN ('institution_admin', 'department_admin')
  );

CREATE POLICY "swap_requests: staff kendi takaslarını görür" ON swap_requests
  FOR ALL USING (
    requester_id = auth.uid() OR receiver_id = auth.uid()
  );

-- ============================================================
-- 5i. constraints politikaları
-- ============================================================

CREATE POLICY "constraints: super_admin tümünü görür" ON constraints
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "constraints: admin kendi kurumunu yönetir" ON constraints
  FOR ALL USING (
    get_my_role() IN ('institution_admin', 'department_admin') AND
    institution_id = get_my_institution()
  );

CREATE POLICY "constraints: staff kendi kısıtlarını görür" ON constraints
  FOR SELECT USING (staff_id = auth.uid());

-- ============================================================
-- 5j. audit_logs politikaları
-- ============================================================

CREATE POLICY "audit_logs: super_admin tümünü görür" ON audit_logs
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "audit_logs: admin kendi kurumunu görür" ON audit_logs
  FOR SELECT USING (
    get_my_role() IN ('institution_admin', 'department_admin') AND
    institution_id = get_my_institution()
  );

-- ============================================================
-- 5k. departments politikaları
-- ============================================================

CREATE POLICY "departments: super_admin tümünü görür" ON departments
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "departments: kurum üyeleri görür" ON departments
  FOR SELECT USING (institution_id = get_my_institution());

CREATE POLICY "departments: admin yönetir" ON departments
  FOR ALL USING (
    get_my_role() IN ('institution_admin', 'department_admin') AND
    institution_id = get_my_institution()
  );

-- ============================================================
-- 5l. titles politikaları
-- ============================================================

CREATE POLICY "titles: super_admin tümünü görür" ON titles
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "titles: kurum üyeleri görür" ON titles
  FOR SELECT USING (institution_id = get_my_institution());

CREATE POLICY "titles: institution_admin yönetir" ON titles
  FOR ALL USING (
    get_my_role() = 'institution_admin' AND
    institution_id = get_my_institution()
  );

-- ============================================================
-- 5m. rooms politikaları
-- ============================================================

CREATE POLICY "rooms: super_admin tümünü görür" ON rooms
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "rooms: kurum üyeleri görür" ON rooms
  FOR SELECT USING (institution_id = get_my_institution());

CREATE POLICY "rooms: admin yönetir" ON rooms
  FOR ALL USING (
    get_my_role() IN ('institution_admin', 'department_admin') AND
    institution_id = get_my_institution()
  );

-- ============================================================
-- 5n. admin_departments politikaları
-- ============================================================

CREATE POLICY "admin_departments: super_admin tümünü görür" ON admin_departments
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "admin_departments: institution_admin yönetir" ON admin_departments
  FOR ALL USING (get_my_role() = 'institution_admin');

CREATE POLICY "admin_departments: department_admin kendi kaydını görür" ON admin_departments
  FOR SELECT USING (profile_id = auth.uid());
