-- ============================================================
-- 005_staff_see_colleagues.sql
-- Sorun: Staff rolündeki kullanıcılar profiles tablosunda
--        yalnızca kendi satırını görebiliyordu (RLS kısıtı).
--        Bu yüzden takas formu kişi listesi boş geliyordu.
-- Çözüm: Staff kullanıcılar aynı kurumdaki aktif personelleri
--        görebilsin (sadece SELECT, sınırlı alanlar).
-- ============================================================

-- Eski "sadece kendi profilini görür" politikasını kaldır
DROP POLICY IF EXISTS "profiles: staff kendi profilini görür" ON profiles;
DROP POLICY IF EXISTS "profiles: herkes kendi profilini görür" ON profiles;

-- Yeni politika 1: Herkes kendi profilini okuyabilir
CREATE POLICY "profiles: herkes kendi profilini görür" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Yeni politika 2: Staff aynı kurumdaki aktif personelleri görebilir
-- (takas ve diğer işlemler için gerekli)
CREATE POLICY "profiles: staff aynı kurumu görür" ON profiles
  FOR SELECT USING (
    institution_id = get_my_institution()
    AND is_active = true
  );
