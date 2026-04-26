-- ============================================================
-- 004_fix_profiles_rls.sql
-- Profiles tablosundaki RLS politikalarını düzelt
-- Sorun: Mevcut politikalar profiles tablosunu sorgulayan
--        EXISTS subquery kullanıyor, bu da RLS aktifken
--        özyinelemeli (recursive) döngüye neden oluyor.
-- Çözüm: SECURITY DEFINER fonksiyonları (get_my_role vb.)
--        kullan veya doğrudan auth.uid() eşleşmesi yap.
-- ============================================================

-- Mevcut politikaları kaldır
DROP POLICY IF EXISTS "profiles: super_admin tümünü görür" ON profiles;
DROP POLICY IF EXISTS "profiles: institution_admin kendi kurumunu görür" ON profiles;
DROP POLICY IF EXISTS "profiles: department_admin kendi departmanını görür" ON profiles;
DROP POLICY IF EXISTS "profiles: staff kendi profilini görür" ON profiles;
DROP POLICY IF EXISTS "profiles: staff kendi profilini günceller" ON profiles;

-- ============================================================
-- Yeni politikalar
-- get_my_role() SECURITY DEFINER olduğu için RLS'i atlıyor
-- ============================================================

-- Herkes kendi profilini okuyabilir (temel politika)
CREATE POLICY "profiles: herkes kendi profilini görür" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Herkes kendi profilini güncelleyebilir 
CREATE POLICY "profiles: herkes kendi profilini günceller" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- super_admin: herkesi görebilir ve yönetebilir
-- get_my_role() SECURITY DEFINER fonksiyondur, RLS'i atlayarak
-- profiles tablosundan role bilgisini alır (sonsuz döngü OLMAZ)
CREATE POLICY "profiles: super_admin tümünü yönetir" ON profiles
  FOR ALL USING (get_my_role() = 'super_admin');

-- institution_admin: kendi kurumundaki profilleri görebilir
CREATE POLICY "profiles: institution_admin kendi kurumunu görür" ON profiles
  FOR ALL USING (
    get_my_role() = 'institution_admin' AND
    institution_id = get_my_institution()
  );

-- department_admin: aynı kurumda, yönettiği departmandaki profiller
CREATE POLICY "profiles: department_admin kendi departmanını görür" ON profiles
  FOR SELECT USING (
    get_my_role() = 'department_admin' AND
    institution_id = get_my_institution() AND
    department_id = ANY(get_my_departments())
  );
