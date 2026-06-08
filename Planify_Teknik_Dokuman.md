# Planify - Akıllı Nöbet ve Ders Programı Sistemi: Kapsamlı Teknik Doküman

## 1. PROJE TANIMI VE AMACI

### Planify Nedir?
Planify, hastaneler, okullar ve çok departmanlı büyük kurumlar için tasarlanmış, yapay zeka destekli, modern bir nöbet ve ders programı hazırlama sistemidir. Yöneticilerin doğal dil ile tanımladığı karmaşık kuralları algılayabilen sistem, personel atamalarını adil, hızlı ve hatasız bir şekilde gerçekleştirir.

### Hangi Problemi Çözüyor?
Manuel program hazırlama süreçleri genellikle karmaşık ve yorucudur.
- **İnsan Hatası Riski:** Çakışan nöbetler, eksik saatler veya yanlış izin günlerine atamalar.
- **Zaman Kaybı:** Yöneticilerin her ay günlerce süren Excel mesaisi.
- **Adil Dağılım Sorunu:** Nöbetlerin veya derslerin personel arasında eşit veya hakkaniyetli dağıtılamaması, personel memnuniyetsizliğine yol açar.

Planify bu sorunları otomatik kısıt motoru ve akıllı planlama özellikleriyle kökünden çözer.

### Hedef Kitle
- **Hastaneler:** Doktor ve hemşire nöbet listeleri, poliklinik görevlendirmeleri.
- **Okullar ve Üniversiteler:** Öğretmen/akademisyen ders programları ve gözetmenlik atamaları.
- **Çok Departmanlı Kurumlar:** 7/24 esasına göre çalışan çağrı merkezleri, güvenlik firmaları ve fabrikalar.

### Temel Değer Önerisi
"Yöneticiler için saatler süren programlama sürecini dakikalara indiren, adil, şeffaf ve yapay zeka ile yönetilebilen akıllı planlama asistanı."

---

## 2. SİSTEM MİMARİSİ

### Genel Mimari Diyagramı

```text
┌─────────────────────────────────────────┐
│           CLIENT LAYER                  │
│  Next.js 14 (Web)  │  Expo (Mobile)     │
└─────────────────────────────────────────┘
              ↓ HTTPS
┌─────────────────────────────────────────┐
│           API LAYER                     │
│     Next.js API Routes (REST)           │
│     Supabase Edge Functions             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│           SERVICE LAYER                 │
│  @planify/shared (Constraint Engine)    │
│  Gemini AI (Natural Language Parser)    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│           DATA LAYER                    │
│     Supabase (PostgreSQL)               │
│     Row Level Security (RLS)            │
│     Realtime Subscriptions              │
└─────────────────────────────────────────┘
```

### Mimari Kararların Gerekçeleri

- **Neden Monorepo?** Web, mobil ve arka plan (ortak iş mantığı) kodlarının tek bir repository'de tutulması. Bu sayede tipler (TypeScript interfaces), kısıt algoritmaları ve araçlar kolayca paylaşılarak kod tekrarı engellenir.
- **Neden Supabase?** Veritabanı (PostgreSQL), kimlik doğrulama, gerçek zamanlı abonelikler ve dosya depolama çözümlerini tek bir pakette sunan açık kaynaklı, güçlü bir Backend-as-a-Service (BaaS) çözümüdür.
- **Neden Next.js App Router?** React ekosistemindeki en güncel mimari olan App Router, Sunucu Bileşenleri (Server Components) ile performansı artırır ve Server Actions ile veri mutasyonlarını güvenli hale getirir.
- **Neden Expo?** React Native üzerinde çalışarak, web için yazılan JavaScript/TypeScript kodunu mobil cihazlarda (iOS/Android) doğal uygulamalara dönüştürür.
- **Neden Shared Package (@planify/shared)?** Kısıt motoru gibi kritik iş mantığı (business logic) kurallarının web ve mobil platformlarda aynı şekilde çalışmasını garanti altına alır.

---

## 3. KULLANILAN TEKNOLOJİLER

### FRONTEND (Web)
- **Next.js 14:** Projenin iskeletini oluşturur. App Router, Server Components ve Server Actions özellikleri ile yüksek performanslı, SEO dostu ve güvenli bir yapı sunar.
- **TypeScript:** Geliştirme aşamasında hata oranını minimuma indirir, otomatik tamamlama ve tip güvenliği sağlar.
- **TailwindCSS:** Utility-first yaklaşımı sayesinde CSS dosyalarına ihtiyaç duymadan, doğrudan bileşenler üzerinden hızlı ve esnek stil tanımlamaları yapılır.
- **shadcn/ui:** Modern, erişilebilir ve özelleştirilebilir kullanıcı arayüzü bileşenleri sunar (Radix UI tabanlı).
- **TanStack Query:** İstemci tarafında veri getirme (data fetching), önbelleğe alma (caching) ve senkronizasyon (server state) işlemlerini optimize eder.

### FRONTEND (Mobil)
- **React Native + Expo:** Tek bir kod tabanı üzerinden hem iOS hem de Android için native performansında uygulamalar geliştirilmesini sağlar.
- **Expo Router:** Dosya tabanlı (file-based) yönlendirme sağlayarak mobil gezinme deneyimini web benzeri, kolay yönetilebilir hale getirir.
- **NativeWind:** Tailwind CSS sınıflarını React Native tarafında kullanmaya olanak tanır.
- **Expo Notifications:** Kullanıcılara mobil cihazları üzerinden anında push bildirimler gönderilmesini sağlar.

### BACKEND
- **Supabase:** Tam teşekküllü PostgreSQL veritabanı altyapısı sunar.
- **Next.js API Routes:** Özel RESTful endpoint'leri tanımlamak için kullanılır.
- **Supabase Edge Functions:** Deno tabanlı çalışan, veritabanı tetikleyicileri veya HTTP istekleri ile çağrılan, arka plan işlemleri (örn. push bildirimi gönderme) için sunucuya yakın, hızlı küçük fonksiyonlardır.

### MONOREPO
- **Turborepo:** Projedeki paketlerin (web, mobil, shared) derleme ve bağımlılık süreçlerini paralel yürüterek performansı artırır.
- **packages/shared:** İş mantığı, algoritmalar ve ortak tiplerin tutulduğu bağımsız paket.

### YAPAY ZEKA
- **Google Gemini 1.5 Flash API:** Sistemde doğal dil işleme görevlerini üstlenir. Yöneticinin girdiği metinleri (örn. "Ahmet'e bu hafta 2'den fazla nöbet yazma") anlar ve yapılandırılmış verilere dönüştürür. Hızlı yanıt süresi nedeniyle Flash modeli tercih edilmiştir.

### DATABASE
- **PostgreSQL:** Dünyanın en gelişmiş açık kaynaklı ilişkisel veritabanı. Güçlü veri bütünlüğü sağlar.
- **Row Level Security (RLS):** Yetkilendirme işlemlerini doğrudan veritabanı seviyesinde çözerek izinsiz veri erişimini engeller.
- **Realtime Subscriptions:** Web soketler aracılığıyla veritabanı değişikliklerini anında istemcilere (web/mobil) yansıtır.

### DEPLOYMENT
- **Vercel:** Next.js web uygulamasının barındırıldığı, edge ağı ile yüksek performans sunan platform.
- **Supabase Cloud:** Veritabanı ve backend servislerinin barındırılması.
- **Expo EAS:** Mobil uygulamanın bulut ortamında derlenip mağazalara (App Store, Play Store) gönderilmesini sağlayan servis.

---

## 4. VERİTABANI TASARIMI

### Tablo Listesi ve Amaçları
- **institutions:** Kurumların (Hastane, Okul vb.) temel bilgilerini tutar.
- **profiles:** Kullanıcıların temel bilgileri (ad, soyad, rol) bulunur. Supabase Auth ile eşleşir.
- **departments:** Kurum içindeki alt birimler.
- **titles:** Personel unvanları (Örn: Uzman Doktor, Asistan, Öğretmen).
- **rooms:** Nöbet/Ders mekanları veya fiziksel odalar.
- **schedules:** Belirli bir döneme ait taslak veya kesinleşmiş ana program kayıtları.
- **schedule_slots:** Programa ait her bir vardiya/nöbet diliminin personel ile eşleştiği kayıt.
- **constraints:** Sistemin otomatik atama yaparken dikkat edeceği kuralların tutulduğu tablo.
- **leave_requests:** Personelin izin talepleri.
- **swap_requests:** Personeller arası nöbet takas talepleri.
- **notifications:** Sistem içi bildirim kayıtları.
- **audit_logs:** Sistemde yapılan kritik değişikliklerin loglandığı denetim tablosu.
- **invitations:** Sisteme yeni kullanıcı davet kodları ve durumları.
- **admin_departments:** Departman yöneticilerinin hangi departmanlardan sorumlu olduğunu bağlayan tablo.

### ER Diyagramı (Basitleştirilmiş)
```text
[institutions] 1 ─── ∞ [departments]
[institutions] 1 ─── ∞ [profiles]
[departments]  1 ─── ∞ [schedules]
[schedules]    1 ─── ∞ [schedule_slots]
[profiles]     1 ─── ∞ [schedule_slots]
[profiles]     1 ─── ∞ [leave_requests]
[profiles]     1 ─── ∞ [constraints]
```

### Row Level Security (RLS)
**RLS Nedir?** PostgreSQL'in sunduğu, tabloya erişimi satır bazında sınırlandıran bir güvenlik özelliğidir.
- **Neden Kullanıldı?** İstek atanın veritabanına doğrudan (Supabase üzerinden) güvenli erişimi için API yazmaya gerek kalmadan güvenlik sağlanır.
- **Rol Bazlı Erişim:** 
  - `super_admin`: Tüm kurumlardaki her veriyi okuyup yazabilir.
  - `institution_admin`: Yalnızca kendi kurumuna (`institution_id`) ait verileri görebilir ve düzenleyebilir.
  - `department_admin`: Yalnızca yetkili olduğu departmana ait verileri düzenleyebilir.
  - `staff`: Yalnızca kendi nöbetlerini, departmanındaki genel programı ve kendi izin/takas taleplerini görebilir.

---

## 5. KISIT MOTORU (@planify/shared)

### Mimari
- **Sıfır Dış Bağımlılık:** Sadece saf TypeScript ile yazılmıştır. Böylece her JavaScript/TypeScript ortamında çalışır.
- **Ortak Kullanım:** `packages/shared` içerisinde bulunur; hem Next.js tarafında planlama yaparken hem de gerektiğinde mobil cihazda (offline veya öngörü) çalıştırılabilir.
- **SOLID Prensipleri:** Her kısıt (constraint) kendi sınıfında veya fonksiyonunda tanımlanır, böylece sisteme yeni bir kısıt eklemek mevcut kodu bozmaz (Open/Closed Principle).

### Kısıt Tipleri ve Algoritması
Örnek kısıtlar (15 adet kural tabanından bazıları):
1. **MAX_SHIFTS_PER_WEEK:** Bir personelin haftalık maksimum nöbet sayısı limitini aşmamasını sağlar.
2. **NO_WEEKEND:** Hafta sonu çalışamama kısıtı.
3. **MIN_REST_HOURS:** İki nöbet arasında en az bulunması gereken dinlenme süresi ihlallerini engeller.
4. **SPECIFIC_DAY_OFF:** Personelin belirlediği özel günlerde nöbet yazılmamasını garantiler.
5. **MAX_CONSECUTIVE_SHIFTS:** Arka arkaya en fazla kaç gün çalışılabileceği sınırı.
...vb.

**Algoritma Akışı:**
1. Verilen tarih aralığındaki tüm günler ve slotlar (vardiyalar) döngüye alınır.
2. Atama yapılırken adil dağılım için personeller "şu ana kadar aldıkları nöbet sayısına göre" artan şekilde sıralanır. En az nöbeti olan personele öncelik tanınır.
3. Her personel için `validateSlot(personel, slot, mevcutt_program)` çağrılır.
4. Bu fonksiyon personelin o gün izni var mı, önceki nöbetiyle dinlenme süresi ihlali var mı, haftalık limit doldu mu gibi tüm kısıtları (`validateSchedule()`) kontrol eder.
5. Kısıtları geçen ilk personele slot atanır. Geçemezse sonraki personele geçilir.
6. Hiçbir personel atanamazsa, o slot "Çözümsüz/Boş" olarak işaretlenip raporlanır.

---

## 6. YAPAY ZEKA ENTEGRASYONU

### Problem ve Çözüm
- **Problem:** Yöneticilerin her personel için detaylı kısıtları (dinlenme süreleri, spesifik günler) karmaşık formlarla doldurması zordur ve teknik bilgi gerektirir.
- **Çözüm:** Yönetici kuralı kendi doğal diliyle yazar. Sisteme entegre edilen **Google Gemini AI**, bu metni anlar ve kısıt motorunun anlayacağı JSON formatına dönüştürür.

### Teknik Detaylar
- **Model:** `gemini-1.5-flash` (düşük gecikme süresi, yüksek metin anlama kapasitesi).
- **Few-Shot Prompting:** Modele sistemin desteklediği JSON kısıt tipleri ve birkaç örnek ("Ayşe perşembe çalışmasın" -> `{"type":"SPECIFIC_DAY_OFF", "day":"Thursday"}`) önceden prompt ile verilir.
- **Personel Eşleştirme:** Metindeki personel adını alıp veritabanındaki `profile_id` (UUID) ile bulan bir katman çalışır.
- **İzin Kayıtları Entegrasyonu:** Sisteme girilen resmi izin kayıtları, yapay zeka olmadan otomatik olarak kısıtlara dahil edilir. Belirsiz ifade toleransı ile sistem ("haftaya çarşamba" gibi) göreceli terimleri güncel takvim verisi ile harmanlar.

### Akış Diyagramı
1. **Admin Yazar:** "Dr. Ali'ye Pazartesi ve Cuma nöbet yazma."
2. **Gemini Parse Eder:** Metni işler ve analiz eder.
3. **JSON Kısıtlar Üretilir:** `[{type: "SPECIFIC_DAYS_OFF", days: [1, 5]}]`
4. **Veritabanı Kaydı:** Bu objeler Ali'nin ID'si ile kaydedilir.
5. **Kısıt Motoru İşletimi:** Program oluşturulurken kurallar okunur ve takvime yansıtılır.

---

## 7. GÜVENLİK MİMARİSİ

Çok katmanlı güvenlik yapısı uygulanmaktadır:

**a) Authentication (Kimlik Doğrulama / Supabase Auth):**
- E-posta/şifre tabanlı giriş sistemi.
- JWT (JSON Web Token) ve oturum (session) yönetimi.

**b) Authorization (Yetkilendirme / RLS):**
- Veritabanı seviyesinde erişim kontrolü, her sorgunun RLS politikaları ile otomatik filtrelenmesi ve uygulama katmanında aşılamaması (bypass edilemez).

**c) Rol Tabanlı Erişim (RBAC):**
- `super_admin`: Sistem geneli her şeye hakimdir.
- `institution_admin`: Sadece kendi kurumunun verilerini idare eder.
- `department_admin`: Sadece bağlı olduğu departmanın süreçlerini yürütür.
- `staff`: Yalnızca kendine atanan veya dahil olduğu verileri izler.

**d) API Güvenliği:**
- Her endpoint üzerinde `auth` kontrolü, rol doğrulama ve Supabase tarafından otomatik Rate Limiting desteği.

**e) Davet Sistemi:**
- Kullanıcılar sisteme doğrudan kaydolup yetki yükseltemez. Yöneticiler özel davet bağlantıları oluşturarak (7 gün geçerli güvenli token) rolleri belirler.

---

## 8. GERÇEK ZAMANLI SENKRONİZASYON

**Web ve Mobil Nasıl Senkronize Çalışıyor?**

**Supabase Realtime:**
- PostgreSQL tarafındaki (INSERT, UPDATE, DELETE) değişiklikler Websocket üzerinden yayınlanır (broadcast).
- Web ve mobil uygulamalar aynı kanalları dinleyerek ekranı anında günceller.

**Kullanım Senaryoları:**
- **Program Yayınlama:** Admin yeni programı "Yayınla" düğmesiyle aktif ettiğinde, vardiyası olan tüm personelin mobil uygulaması sayfa yenilemeye gerek kalmadan güncellenir.
- **Takas Senaryosu:** Takas (Swap) isteği onaylandığında her iki personelin takvimi (ve gerekiyorsa program listesi) otomatik değişir.
- **Bildirimler:** Yeni bir işlem gerçekleştiğinde (örn: izin reddi) bildirim kutucuğu anında belirir.

---

## 9. KULLANICI AKIŞLARI

- **Super Admin:** Giriş -> Tüm Kurumları Görüntüle -> Kurum Detayı -> Kullanıcı ve Kurum Yöneticisi Yönetimi.
- **Institution Admin:** Giriş -> Dashboard -> Departman Seç -> Program Oluştur -> AI ile Kısıt/Kural Tanımla -> Otomatik Taslak Üret -> Manuel Düzenlemeler Yap -> Yayınla -> Tüm Personele Otomatik Bildirim Gitsin.
- **Department Admin:** Yalnızca sorumlu olduğu departman için tamamen aynı akışı uygular.
- **Staff (Web):** Giriş -> Kendi Programını (Takvim) Görüntüle -> Uygun Olmayan Günler İçin İzin Talebi Oluştur -> Başkasıyla Takas Talebi Gönder -> Bildirimleri Oku.
- **Staff (Mobil):** Giriş -> Dashboard -> Takvim Modu ile Nöbetleri/Dersleri İncele -> Takas ve İzin Taleplerini Oluştur/Yanıtla -> Bildirimlere Göz At -> Profil Güncelle.

---

## 10. PERFORMANS KARARLARI

- **Server Components:** Veri getirme (fetching) işlemleri sunucuda tamamlanarak istemci tarafına sadece hafifletilmiş HTML ve UI gönderilir.
- **RLS Güvenliği:** Ekstra ve karmaşık ara katman API'leri (BFF vb.) yerine güvenliğin veritabanında kodlanması yanıt sürelerini hızlandırır.
- **Batch Insert:** Takvim oluşturulurken yüzlerce slot tek bir Bulk Insert sorgusuyla PostgreSQL'e aktarılır, bağlantı havuzu yorulmaz.
- **Index'ler:** Sık sorgulanan `user_id`, `department_id`, `date` gibi kolonlar üzerinde B-Tree index'lemeleri yapılmıştır.
- **Shared Package (@planify/shared):** Kod tekrarı önlenir; mantıksal fonksiyonların bundle boyutları küçülür.
- **Edge Functions:** Sunucuya (veritabanına) en yakın lokasyonda çalışan Edge Functions ile push bildirim vs. hızlı ve izole şekilde tetiklenir.

---

## 11. KARŞILAŞILAN ZORLUKLAR VE ÇÖZÜMLER

- **RLS Recursion (Sonsuz Döngü) Sorunu:** RLS sorgularında tabloyu kendisiyle ilişkilendirerek yapılan rollerin döngü yaratması. **Çözüm:** JWT token içerisindeki `user_metadata` kullanılarak ekstra sorgu atılması önlendi.
- **Timezone (Zaman Dilimi) Sorunu:** Local ortamlar (tarayıcı) ve UTC zamanlarının çakışması. **Çözüm:** Veritabanında zamanlar saf `TIMESTAMPTZ` olarak (UTC) saklandı, arayüz tarafında coğrafi çevrim gerçekleştirildi.
- **24 Saatlik Nöbet ve Gece Yarısı Geçişi:** İki güne yayılan (18:00 - 08:00 vb.) vardiyalar. **Çözüm:** Slot tablosu `date` (ana gün) ve timestamp tabanlı başlangıç-bitiş dilimlerine sahip hale getirildi.
- **Realtime Dinleme Limitleri:** Veritabanındaki her şeyin dinlenmesi performans kaybı yaratıyordu. **Çözüm:** `eq` filtreleriyle sadece kullanıcının kendi veya departmanındaki değişikliklere abone olması sağlandı.
- **Monorepo Type Resolution:** Shared paket içerisindeki tiplerin Next.js ve Expo tarafında görülmeme problemi. **Çözüm:** `tsconfig.json` dosyasındaki `paths` konfigürasyonu ve Turborepo özellikleri yapılandırılarak çözüldü.
- **Takas Sonrası Slot Ownership (Sahibi) Değişimi:** RLS dolayısıyla nöbet sahibinin kendi verisini değiştirme yetkisi çakışması. **Çözüm:** Takas onayı sadece yetkili bir backend `Server Action` (veya veritabanı RPC fonksiyonu) ile RLS bypass edilerek güvenli transaction ile aktarıldı.

---

## 12. GELİŞTİRİLEBİLECEK ÖZELLİKLER

- **AI ile Tam Otomatik Optimizasyon:** Kısıt motoruna yapay zeka güdümlü 'Tavlılama (Simulated Annealing) veya Genetik Algoritmalar' eklenerek maksimum personel memnuniyeti hesabı yapmak.
- **Raporlama ve Analitik Dashboard:** Yöneticilere departman bazlı saat çizelgesi, personel izin dağılımı gibi verileri görsel grafiklerle sunmak.
- **Takvim Export:** Çıktıların Google Calendar, Outlook veya iCal (ics) formatında personele iletilmesi.
- **Çoklu Dil Desteği:** i18n altyapısı ile sistemin uluslararası kurumlarca kullanılabilmesi.
- **Offline Mobil Çalışma:** Uygulamanın internet bağlantısı yokken de en son çekilmiş taslak/kesinleşmiş takvimleri gösterebilmesi.
- **SMS Bildirim Entegrasyonu:** Gerçekten acil boşalan nöbetler (örn: hastalık durumu) için personellere anında SMS iletilmesi.

---

## 13. MİMARİ YAKLAŞIMLAR VE TASARIM DESENLERİ (DESIGN PATTERNS)

Projede esneklik, sürdürülebilirlik ve performans için endüstri standardı mimari kalıplar ve tasarım desenleri benimsenmiştir:

### Mimari Yaklaşımlar
1. **Monorepo Mimarisi:** Frontend ve ortak iş mantığının tek repository'de (Turborepo) tutularak kod tekrarının önlendiği yaklaşım.
2. **Serverless (Sunucusuz) Mimari:** Supabase Edge Functions ve Next.js API Routes kullanılarak geleneksel sunucu maliyetleri ve bakımı ortadan kaldırılmıştır.
3. **Event-Driven (Olay Güdümlü) Mimari:** Supabase Realtime kullanılarak veritabanındaki değişikliklerin anında ilgili istemcilere (Web/Mobil) fırlatıldığı (broadcast) mimari.
4. **Backend-as-a-Service (BaaS):** Supabase ile kimlik doğrulama, veritabanı ve dosya depolama gibi arka plan sistemleri hazır bir çatı olarak kullanılmış, tamamen iş mantığına odaklanılmıştır.

### Tasarım Desenleri (Design Patterns)
1. **Strategy Pattern (Strateji Deseni):** 
   - *Kullanım Yeri:* Kısıt Motoru (@planify/shared).
   - *Açıklama:* `MaxShiftsPerWeek`, `NoWeekend`, `MinRestHours` gibi kısıtların her biri aynı arayüzü (`IConstraint`) uygular, ancak kendi `validate()` (doğrulama) mantıklarını barındırır. Yeni bir kural (strateji) eklenmek istendiğinde eski kodlar değiştirilmez (Open/Closed Prensibi korunur).
2. **Factory Pattern (Fabrika Deseni):**
   - *Kullanım Yeri:* Yapay Zeka entegrasyonu sonrası.
   - *Açıklama:* Gemini AI'dan dönen yapılandırılmış JSON verisi (Örn: `{"type": "SPECIFIC_DAY_OFF", "day": "Friday"}`), Factory Pattern aracılığıyla çalışma zamanında (runtime) bellekte ilgili kısıt strateji sınıflarına (`new SpecificDayOffConstraint(...)`) dönüştürülür.
3. **Observer / Pub-Sub Pattern (Gözlemci Deseni):**
   - *Kullanım Yeri:* İstemci tarafı state yönetimi.
   - *Açıklama:* React Query ve Supabase abonelikleri kullanılarak, veritabanındaki bir değişim olduğunda veya cache kirlendiğinde (invalidate), o veriyi dinleyen tüm bileşenler otomatik olarak güncellenir.
4. **Singleton Pattern:**
   - *Kullanım Yeri:* Supabase veritabanı istemcisi (client).
   - *Açıklama:* Uygulama genelinde bağlantı havuzunu şişirmemek ve bellek tüketimini optimize etmek için Supabase istemcisinin tek bir örneği (instance) yaratılarak tüm sayfalarda ortak kullanılır.

---
*Bu doküman, Planify sisteminin teknik altyapısını ve mimarisini özetlemek amacıyla hazırlanmıştır.*
