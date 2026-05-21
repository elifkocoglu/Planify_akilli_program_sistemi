-- DÜZELTME 3: "İsimsiz" Hatası Çözümü
-- 1. handle_new_user fonksiyonunu güncelle (full_name ve name alanlarını kontrol eder)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      'İsimsiz'
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'staff'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN profiles.full_name = 'İsimsiz' OR profiles.full_name = ''
      THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Mevcut "İsimsiz" veya boş isimli kayıtları auth.users tablosundan çekerek güncelle

UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
  NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
  p.full_name
)
FROM auth.users u
WHERE p.id = u.id
AND (p.full_name = 'İsimsiz' OR p.full_name = '');
