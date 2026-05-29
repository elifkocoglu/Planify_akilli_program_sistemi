# Push Notification — Deploy & Kurulum Talimatları

## 1. Expo Project ID Alma

1. https://expo.dev adresine gidin
2. Hesabınıza girin → Planify projesini açın
3. **Project ID**'yi kopyalayın (UUID formatında)
4. `apps/mobile/.env` dosyasında şunu güncelleyin:
   ```
   EXPO_PUBLIC_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
5. `apps/mobile/app.json` dosyasında şunu güncelleyin:
   ```json
   "extra": {
     "eas": {
       "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     }
   }
   ```

---

## 2. Supabase Edge Function Deploy

### Supabase CLI kurulumu (eğer kurulu değilse)
```powershell
npm install -g supabase
```

### Login
```powershell
supabase login
```

### Proje ref bilgisi
Supabase dashboard → Settings → General → **Reference ID** (örn: `ddczuwuirndnxlcsrvts`)

### Projeyi bağla
```powershell
supabase link --project-ref ddczuwuirndnxlcsrvts
```

### Edge Function deploy et
```powershell
# Proje kök dizininden çalıştırın
supabase functions deploy send-push-notification
```

### Doğrulama
Supabase Dashboard → Edge Functions → `send-push-notification` → **Active** görünmeli

---

## 3. Test Etme

Fiziksel cihazda Expo Go ile açın (iOS simulator push desteklemez, Android emulator destekler).

Giriş yapınca konsolda şu görünmeli:
```
[Push] Token alındı: ExponentPushToken[xxxxxx...]
[Push] Token başarıyla kaydedildi
```

Supabase Table Editor'da `profiles` tablosunda `push_token` kolonu dolmuş olmalı.
