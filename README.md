# ATU Portal Connect

Lovable Prompt — "ATU Şəxsi Kabinet" Universitet Portalı

Bu faylı olduğu kimi (bütöv) Lovable-ə yapışdır. Şəkilləri (atu-kodera-screenshots.zip-i açıb) Lovable-in söhbət pəncərəsinə referans dizayn kimi əlavə et ki, model dəqiq eyni görünüşü çıxarsın.

🎯 LAYİHƏNİN ÜMUMİ MƏQSƏDİ

Sən mənim üçün Azərbaycan Texnologiya Universitetinin tələbə/müəllim şəxsi kabinet portalını (referans sayt: atu.kodera.az) sıfırdan, təmiz kod bazası ilə yenidən qururşan. Bu, mövcud olan real bir sistemin bərpasıdır — mən dizaynı və funksionallığı əlavə etdiyim skrinşotlardan tam olaraq təkrarlamağını istəyirəm, sonra üzərində öz brendləşdirmə dəyişikliklərimi edəcəyəm.

İŞ QAYDASI: Bu tapşırığı FAZALARLA et. İndi mən yalnız FAZA 1-i başlatmağını istəyirəm (aşağıda ayrıca bölmədə izah olunub). Digər fazalara mən təsdiq verdikcə keçəcəyik. Amma bütün sistemin tam memarlığını, məlumat modelini və səhifə strukturunu bu promptun sonuna qədər oxu ki, FAZA 1-i düzgün təməl üzərində qurasan.

🧱 TEXNOLOJİ TƏLƏBLƏR (MƏCBURİ)

Frontend: React + TypeScript + Vite, Tailwind CSS + shadcn/ui komponentləri.

Backend/Verilənlər bazası: Lovable Cloud-u layihənin əvvəlində aktivləşdir (built-in Supabase-based backend). Autentifikasiya (email+şifrə ilə giriş/qeydiyyat), verilənlər bazası cədvəlləri, Row Level Security (RLS) siyasətləri və fayl saxlama (storage buckets — profil şəkilləri, tapşırıq faylları, transkript PDF-ləri üçün) Lovable Cloud üzərində qurulmalıdır.

Deploy: Layihə Vercel-ə deploy ediləcək formada hazırlanmalıdır — build əmrləri standart Vite quruluşuna uyğun olmalı (npm run build, output dist/), environment dəyişənləri .env vasitəsilə idarə olunmalı, vercel.json faylı əlavə et (SPA rewrite qaydası ilə — bütün route-lar index.html-ə yönləndirilsin ki, client-side routing Vercel-də 404 verməsin). Lovable Cloud-un backend hissəsi ayrıca işləyəcək, Vercel yalnız frontend-i host edəcək.

Routing: React Router. Bütün alt-səhifələr üçün qorunan (protected) route-lar olmalı — giriş etməyən istifadəçi heç bir daxili səhifəyə keçə bilməməlidir, avtomatik login səhifəsinə yönləndirilməlidir.

Responsive dizayn: Desktop (əsas prioritet, skrinşotlar desktop görünüşdədir) + tablet + mobil üçün adaptiv olmalı, sidebar mobil görünüşdə collapse/hamburger menyuya çevrilməlidir.

Dil: Bütün interfeys mətnləri Azərbaycan dilində olmalıdır (aşağıda konkret mətnləri verirəm, onları eynilə istifadə et).

İkonlar: lucide-react kitabxanasından istifadə et (skrinşotlardakı outline stil ikonlara uyğun gəlir).

👥 İSTİFADƏÇİ ROLLARI (RBAC)

Sistemdə 4 rol olmalıdır, hər birinin fərqli icazələri və fərqli görünən modulları var. profiles cədvəlində role sütunu (enum: 'admin' | 'dekan' | 'tyutor' | 'telebe') saxlanmalıdır, RLS siyasətləri bu rola görə qurulmalıdır.

1. Tələbə (telebe) — defolt rol, referans skrinşotlar əsasən bu rolun görünüşüdür

Ev (Dashboard): öz qiymətlərini, davamiyyətini, cari statusunu görür, tapşırıq yükləyə bilir.

Təqvim: öz qrupunun dərs/tədbir cədvəlini görür (redaktə edə bilməz).

İmtahanlar: öz imtahan nəticələrini görür.

Söhbət: öz qrup çatlarına (fənn əsaslı qruplar) qoşulur, mesaj yaza bilir.

Kitabxana: bütün kitabları görür, axtarır, oxuya/yükləyə bilir.

Ofis: sənədlərini yükləyə/axtara bilir.

Profil, Təhlükəsizlik, Bildiriş və Görünüş parametrləri: özününkünü redaktə edir.

Transkript: öz rəsmi transkriptini PDF kimi yükləyə bilir.

2. Tyutor (tyutor)

Tələbənin gördüyü hər şeyi görür, əlavə olaraq:

Öz nəzarətində olan qrup(lar)ın davamiyyətini qeyd edə bilir (checkbox/cədvəl formatında dərs-dərs).

Qeydlər (Qeydlər cədvəli — Xeyr/Tarix/Mövzu/Fayl/Kəsilməzlik/Qeydlər sütunları) əlavə edə/redaktə edə bilir.

Tapşırıq və fayl yükləyə bilir (tələbələrə görünəcək formada).

Öz qrupunun tələbə siyahısını görür və idarə edir.

3. Dekan (dekan)

Fakültə səviyyəsində icmal görür: bütün qrupların, tyutorların statistikası (davamiyyət, qiymət ortalaması) üçün ayrıca "Fakültə İcmalı" dashboard bölməsi.

Tyutor və tələbə hesablarını görə bilir (yalnız oxuma — profillərinə baxa bilir), lazım gəldikdə status (aktiv/passiv) dəyişə bilir.

Hesabatlar (exportable — CSV/PDF) generasiya edə bilir.

Kitabxana və Ofis modullarına tam giriş.

4. Admin (admin)

Tam sistem idarəçiliyi: istifadəçi yaratma/silmə/rol təyin etmə, qrup yaratma, fənn yaratma, kitabxanaya kitab əlavə etmə, bildiriş göndərmə (bütün istifadəçilərə və ya seçilmiş qruplara).

Ayrıca "Admin Panel" bölməsi olmalıdır (sidebar-da yalnız admin rolunda görünən əlavə bir ikon/link): İstifadəçilər, Qruplar, Fənnlər, Kitabxana idarəetməsi, Sistem tənzimləmələri kimi alt-sekmələr.

Bütün RLS siyasətlərində admin hər cədvələ tam CRUD girişinə malik olmalıdır.

Qeyd: Qeydiyyat (Hesab yaradın) zamanı istifadəçi defolt olaraq "telebe" rolu ilə yaranır; digər rollar yalnız admin tərəfindən təyin oluna bilər.

🎨 DİZAYN SİSTEMİ (skrinşotlara əsaslanaraq)

Rəng palitrası: Əsas fon açıq boz-mavi (#E9ECF3-ə yaxın), kartlar ağ (#FFFFFF) və ya çox açıq boz (#F5F6FA), əsas aksent rəngi mavi (#1C64F2-ə yaxın, tünd mavi mətn başlıqları #0F1B3D-ə yaxın lacivərd/navy). Uğur/aktiv statuslar üçün yaşıl badge, xəbərdarlıq üçün narıncı/qırmızı.

Tipoqrafiya: Qalın, dəyirmi sans-serif font (skrinşotlarda "Poppins" və ya "Inter"/"Manrope"-ə bənzəyir — istifadə et Inter və ya Manrope, başlıqlar font-bold, geniş hərfaralığı olmadan).

Sidebar (sol naviqasiya paneli): Dar, ikon-əsaslı, sabit en (~80px), ağ fon, yumşaq künclər, kölgə ilə əsas kontentdən ayrılır.

Yuxarıda: hamburger menyu (aç/bağla), sonra Ev (ev ikonu), Təqvim (təqvim ikonu), İmtahanlar (qələm/redaktə ikonu).

Ayırıcı xətt.

Söhbət (çat balonu ikonu), Kitabxana (kitab/bookmark ikonu), Ofis (kitab açılmış/vərəq ikonu).

Aşağıda (ayırıcı xətdən sonra): Bildirişlər (zəng ikonu), Profil (istifadəçi avatarı — dairə), Çıxış (logout ikonu).

Aktiv olan bölmə mavi dolğulu dairə/kvadrat kimi vurğulanır (icon mavi fonda ağ).

Sidebar genişləndirildikdə (hamburger klik) hər ikonun yanında mətn label görünür (referans: "Menyu", "Ev", "Təqvim", "İmtahanlar", "Söhbət", "Kitabxana", "Ofis", "Bildirişlər", istifadəçi adı, "Çıxış").

Kartlar: Yumşaq künc radius (rounded-2xl), incə kölgə, daxili padding bol.

Boş vəziyyət (empty state) dizaynı: Ortalanmış boz ikon (məs. söndürülmüş zəng, kəsik şəkil ikonu) + altında boz mətn (məs. "Bildiriş tapılmadı.", "Fayl hələ yüklənməyib."). Bunu bütün modullarda ardıcıl istifadə et.

Login səhifəsi: İki panelli ekran — sol tərəf tünd bordo/şərab rəngli (#4A0E1E-ə yaxın) fonda universitetin ağ rəngli logo + adı ortalanmış, sağ tərəf ağ fonda giriş forması (İstifadəçi adı, Şifrə — göz ikonu ilə göstər/gizlət, "Şifrənizi unutmusunuz?" linki, tünd mavi "Daxil ol" düyməsi, aşağıda "Hesab yaradın" linki).

🗺️ SƏHİFƏ-SƏHİFƏ FUNKSİONAL SPESİFİKASİYA

1. Giriş (Login) / Qeydiyyat

İstifadəçi adı + şifrə ilə giriş (Lovable Cloud auth — email daxili istifadəçi adına map olunsun və ya email sahəsi kimi işlənsin).

"Hesab yaradın" — Ad, Soyad, Ata adı, doğum tarixi, cins, FIN kodu, e-poçt, telefon, şəhər/ünvan, fakültə/bölmə seçimi olan qeydiyyat forması.

"Şifrənizi unutmusunuz?" — e-poçt ilə reset axını (Lovable Cloud auth reset funksiyası).

2. Ev (Dashboard) — rola görə fərqli variant

Tələbə görünüşü (referans şəkillər 8-9):

Sol/mərkəz sütun: "İmtahan balları" kartı → 3 alt-kart: Semestr Qiyməti (böyük rəqəm, məs. "0"), İmtahan balı ("—"), Yekun qiymət ("—"), altında "Detallara baxın →" linki.

"Qeydlər" cədvəli: sütunlar Xeyr | Tarix | Mövzu | Fayl | Kəsilməzlik | Qeydlər, boşdursa "Məlumat yoxdur." mətni.

Sağ sütun: fənn seçici dropdown (yuxarıda mavi zolaq), "Davamlılıq" kartı (0/8 formatında say), "Vəziyyət" kartı ("Yoxdur"/"Kəsilməyib" kimi status), "Tapşırığı yükləyin" — sürükləyib-burax fayl yükləmə zonası (dashed border, bulud-yuxarı ikonu, "Fayllarınızı bura atın və ya yükləmək üçün klikləyin." mətni), "Faylı yükləyin" → "Digər" linki.

(Referans şəkil 16-dakı "Canlı Görünüş" paneli — bu, "Görünüş parametrləri" səhifəsindəki canlı önizləmədir, ayrıca komponent kimi qur ki, tema/rəng dəyişəndə bu mini-dashboard önizləməsi anında yenilənsin.)

Tyutor görünüşü: Yuxarıdakı + öz qrup(lar)ının siyahısı, hər qrup üçün sürətli keçid (davamiyyət qeydi, qiymətləndirmə).

Dekan görünüşü: Fakültə üzrə statistik kartlar (ümumi tələbə sayı, ortalama davamiyyət, ortalama qiymət) + qrup/tyutor reytinq cədvəli.

Admin görünüşü: Sistem statistikası (istifadəçi sayı rol üzrə, aktiv sessiyalar sayı, son qeydiyyatlar) + tez keçidlər (İstifadəçi əlavə et, Kitab əlavə et, Bildiriş göndər).

3. Təqvim (referans şəkil 7)

Aylıq grid görünüş: Bazar ertəsi–Bazar günü sütunları, hər gündə kiçik yaşıl xətt + tədbir başlığının qısaldılmış forması (bir gündə birdən çox tədbir ola bilər — üst-üstə sətir kimi göstər).

Sağ panel: il/ay naviqasiyası (◀ 2026-cı il ▶, aylar toggle şəklində — Yanvar, Fevral, Mart (aktiv, mavi dairə), Aprel, May, İyun, İyul, Avqust, Sentyabr, Oktyabr, Noyabr, "Axtarış").

Seçilmiş günün detalları: tarix başlığı ("13 Mart"), saat aralığı (13:00–14:20), tədbir adı, qrup + müəllim adı.

Sağ-alt küncdə üzən "+" düyməsi — yeni tədbir əlavə etmək üçün (yalnız tyutor/dekan/admin görür; tələbə görmür).

Tyutor/admin üçün tədbir əlavə/redaktə/sil modalı: başlıq, tarix, başlanğıc-bitmə saatı, qrup seçimi, təsvir.

4. İmtahanlar

Referans olaraq "Ev" səhifəsindəki "İmtahan balları" kartlarının genişləndirilmiş versiyası: bütün fənnlər üzrə imtahan cədvəli (Fənn | Tarix | Bal | Status).

Tyutor/admin rolu üçün bal daxiletmə interfeysi.

5. Söhbət (referans şəkil 6)

3 sütunlu layout:

Sol: "Qruplar" başlığı, axtarış inputu ("Qrup axtarışı..."), qrup siyahısı (hər sətir: dairəvi avatar-placeholder, qrup adı — məs. "4134a - Qrafik təsvirin və video istehsalının əsasları", son mesaj önizləməsi/"Hələ mesaj yoxdur.", bəzilərinin yanında yaşıl "doğrulanmış" badge ikonu).

Mərkəz: seçilmiş qrupun başlığı + doğrulanmış badge, axtarış/üç-nöqtə (⋮) ikonları, mesaj sahəsi (boşdursa böyük boz çat-balon ikonu + "Hələ mesaj yoxdur."), alt hissədə mesaj yazma inputu (emoji, fayl əlavə et (📎) ikonları, göndər düyməsi — mavi dairəvi, təyyarə ikonu).

Sağ: qrup profili — böyük avatar, qrup adı, üzv sayı, "Şəkillər/Videolar/Səslər/Fayllar" siyahısı (hər birinin yanında say və ">" ikonu — klikləndə həmin media növünün qalereyasına keçir), aşağıda üzv siyahısı (avatar, ad, rol — "Müəllim"/"Tələbə").

Real-time mesajlaşma Lovable Cloud (Supabase realtime) üzərindən qurulmalıdır.

6. Kitabxana (referans şəkillər 3, 4, 5)

Ana səhifə: "Rəqəmsal Kitabxana" başlıq, alt-mətn ("EPUB və PDF formatlarında 20.000-dən çox onlayn kitab."), böyük axtarış paneli ("Kitablar, müəlliflər və ya mənbələr axtarın." + mavi "Axtarış" düyməsi).

"Kateqoriyalar" grid-i (5 sütunlu, hər biri dairəvi ikon + ad): Roman, Şəxsi İnkişaf, Elm və Texnologiya, Tarix, Psixologiya, Detektiv və Triller, Fantaziya və Elmi Fantastika, Fəlsəfə, Uşaqlar və Gənclər, Poeziya və Ədəbiyyat, və s. (referans şəkildə daha çox kateqoriya sətri var — 3-cü sətirdə əlavə ikonlar görünür, buraya "Biznes", "Din", "İncəsənət", "Digər" kimi kateqoriyalar əlavə et).

"Son Əlavə Olanlar" bölməsi ("NEW" nişanı ilə) — kitab üz qabığı şəkilləri grid şəklində (5 sütun x 2 sətir), hər kartın altında kitab adı (qalın) + müəllif adı (boz).

Kitab kartına klik → kitab detalı səhifəsi (üz qabığı, təsvir, "Oxu"/"Yüklə" düymələri, PDF/EPUB reader inteqrasiyası — sadə PDF.js viewer kifayətdir).

Admin/dekan üçün "Kitab əlavə et" forması (başlıq, müəllif, kateqoriya, üz qabığı şəkli, fayl yükləmə).

7. Ofis (referans şəkil 3-ə bənzər boş vəziyyət)

Fayl idarəetmə sistemi: axtarış paneli ("Faylları axtarın...") + sağ üstdə mavi "Yüklə" düyməsi (bulud-yuxarı ikonu ilə).

Boşdursa: kəsik-şəkil ikonu + "Fayl hələ yüklənməyib." mətni.

Yüklənmiş fayllar grid/siyahı formatında (fayl ikonu, adı, ölçüsü, tarixi, yükləmə/silmə düymələri).

8. Bildirişlər (referans şəkil 2)

Boş vəziyyət: söndürülmüş zəng ikonu + "Bildiriş tapılmadı." mətni.

Doludursa: bildiriş kartları (ikon-tipə görə rəngli işarə, başlıq, mətn, vaxt, oxunmamış = mavi nöqtə).

9. Profil bölməsi (Menyu → şəkil 1)

Menyu (sidebar-dakı profil dairəsinə klik) 6 seçim açır:

Profil parametrləri (şəkil 12–13): sol tərəfdə böyük dairəvi avatar (üzərində qələm ikonu ilə dəyişdirmə), Ad Soyad, bölmə badge-i, İstifadəçi adı, Vəziyyət (AKTİV — yaşıl badge), Sosial vəziyyət. Sağda bölmələr: Şəxsi məlumatlar (Ad, Soyad, Ata adı, Doğum tarixi, Cins, FİN kodu), Əlaqə Məlumatı (E-poçt, Telefon, Şəhər), Akademik məlumat (Bölmə, Fakültə, Qrup, Sinif, Tədris ili, Təhsil növü, DİM balı). Redaktə mümkün olmalıdır (inline edit və ya modal).

Təhlükəsizlik (şəkil 14): "Giriş və Təhlükəsizlik" bloku — Şifrə (son yeniləmə tarixi + "Dəyişiklik" düyməsi), İki faktorlu identifikasiya (toggle switch). "Aktiv sessiyalar" bloku — cihaz+brauzer adı, "BU CİHAZ" badge-i cari sessiya üçün, məkan (şəhər, ölkə), IP ünvanı, son aktivlik vaxtı, hər sessiyanın yanında çıxış ikonu; yuxarıda qırmızı "Hamısından çıx" düyməsi.

Bildiriş parametrləri (şəkil 15): "Bildiriş növləri" (Sistem, Tədbir, Xəbərdarlıq, Mükafat, Şəxsi, Sosial, Xüsusi Gün, Elan — hər biri toggle switch ilə), "Bildiriş kanalları" (Tətbiqdə olmayan, E-poçt, İtələyin (push) — toggle switch).

Parametrlərə baxın / Görünüş parametrləri (şəkil 16): "Mövzu" seçimi — Açıq/Tund/Sistem (3 seçimli toggle button qrupu, seçili olan mavi/vurğulu fonda). "Rəng Palitrası" — 4 seçim kartı (Orijinal-mavi, Qızılı qızılı-çəhrayı, Meşə-yaşıl, Gün batımı-narıncı), hər biri rəng nöqtəsi + ad + təsvir. "Dil Seçimi" dropdown (Azərbaycan defolt). "Şrift Ölçüsü" slider (kiçik "A" – böyük "A" arası). Sağda "Canlı Görünüş" paneli — seçilən tema/rəng/şrift dəyişikliklərini real vaxtda əks etdirən mini-dashboard önizləməsi (yuxarıda izah olundu).

Transkript (şəkil 17): ortalanmış sənəd ikonu (üzərində endirmə düyməsi), "Transkriptinizi yükləyin." başlığı, açıqlama mətni ("Rəsmi transkriptinizi cihazınıza PDF formatında yükləyə bilərsiniz. Sənəd rəqəmlərlə imzalanıb və rəsmi qurumlarda etibarlıdır."), böyük mavi "PDF olaraq yükləyin" düyməsi, "Son yenilənmə:" mətni.

Yardım Mərkəzi (şəkil 18): "Necə Kömək Edə Bilərik?" başlığı + açıqlama + axtarış paneli. Aşağıda accordion formatında FAQ bölmələri (məs. "Hesab və Giriş Prosedurları" açılmış vəziyyətdə: "Şifrəmi unutdum, nə etməliyəm?", "Hesab məlumatlarımı necə yeniləyə bilərəm?", "İki faktorlu identifikasiya nədir və onu necə aktivləşdirmək olar?", "Daxil ola bilmirəm, nə etməliyəm?" — hər sualın altında qısa cavab mətni). Bir neçə əlavə kateqoriya da əlavə et (məs. "Kitabxana və Fayllar", "Ödəniş və Təhsil haqqı", "Texniki Dəstək").

🗄️ MƏLUMAT MODELİ (Lovable Cloud cədvəlləri — minimum)

profiles — user_id (FK auth), ad, soyad, ata_adi, dogum_tarixi, cins, fin_kodu, e_poct, telefon, sheher, unvan, istifadeci_adi, bolme, fakulte, qrup, sinif, tedris_ili, tehsil_novu, dim_balı, avatar_url, status, role, sosial_veziyyet

groups — id, ad, tyutor_id

group_members — group_id, profile_id

courses (fənlər) — id, ad, qrup_id, tyutor_id

exam_scores — id, profile_id, course_id, semestr_qiymeti, imtahan_balı, yekun_qiymet

attendance (davamiyyət) — id, profile_id, course_id, tarix, statusu (var/yox)

notes (Qeydlər cədvəli) — id, profile_id, tarix, movzu, fayl_url, kesilmezlik, qeyd

calendar_events — id, başlıq, tarix, başlanğıc_saat, bitmə_saat, qrup_id, təsvir, yaradan_id

chat_groups, chat_messages, chat_group_members

library_books — id, ad, muellif, kateqoriya, uz_qabigi_url, fayl_url, format (pdf/epub), elave_olunma_tarixi

office_files — id, ad, sahib_id, fayl_url, olcusu, tarix

notifications — id, profile_id, tip, başlıq, mətn, oxunub_mu, tarix

notification_settings — profile_id, sistem, tedbir, xeberdarliq, mukafat, shexsi, sosial, xususi_gun, elan, e_poct_kanali, push_kanali

sessions_log — profile_id, cihaz, brauzer, ip, sheher, olke, son_aktivlik, cari_mi

transcripts — profile_id, fayl_url, son_yenilenme

Bütün cədvəllərdə RLS aktiv olmalı: istifadəçi yalnız öz məlumatını görə/redaktə edə bilər, tyutor öz qrupunun məlumatını, dekan öz fakültəsinin, admin hamısını.

🚀 FAZA 1 — İNDİ ET (yalnız bunu icra et, digərlərini gözlə)

Zəhmət olmasa yalnız aşağıdakıları indi et, qalanını mən təsdiqlədikcə növbəti mesajlarda davam etdirəcəyik:

Lovable Cloud-u aktivləşdir (auth + database + storage), yuxarıdakı cədvəl strukturunun əsasını (heç olmasa profiles, groups, courses, exam_scores, attendance, notes cədvəllərini) yarat və RLS-i qur.

Login/Qeydiyyat səhifəsini yuxarıdakı dizayn təsvirinə uyğun tam funksional qur (email+şifrə ilə real qeydiyyat/giriş, Lovable Cloud auth ilə).

Əsas layout skeletonunu (sol sidebar + əsas content area) tam görünüş (UI) səviyyəsində qur — bütün naviqasiya ikonları, hover/aktiv vəziyyətləri, genişlənən/yığılan sidebar davranışı ilə. Route-lar boş olsa belə (placeholder "Tezliklə" mətni ilə) hamısı üçün sidebar linkləri işləməlidir.

Ev (Dashboard) səhifəsini tələbə rolu üçün tam vizual olaraq (statik/mock data ilə) şəkil 8–9-a bənzər şəkildə qur.

Profil parametrləri, Təhlükəsizlik, Bildiriş parametrləri, Görünüş parametrləri, Transkript, Yardım Mərkəzi alt-səhifələrini vizual olaraq (şəkil 12–18-ə uyğun) statik/mock data ilə qur, "Menyu" səhifəsindən (şəkil 1) bu 6 karta klikləyəndə açılsın, geri düyməsi işləsin.

Görünüş parametrləri səhifəsindəki tema (Açıq/Tund/Sistem) və rəng palitrası seçimlərini real işlək et (dark mode + 4 rəng temasını bütün tətbiqə tətbiq edən qlobal state — React Context və ya Zustand ilə, localStorage-də saxlanmalı ki, səhifə yenilənəndə itməsin).

vercel.json faylını əlavə et və layihənin Vercel-ə problemsiz deploy oluna biləcəyini təmin et (build/preview yoxla).

Bu FAZA 1-in sonunda əsas naviqasiya tam işlək, dizayn referans şəkillərə vizual olaraq 1:1 yaxın olmalıdır — funksional backend məntiqi (real çat, real kitabxana axtarışı, real davamiyyət hesablamaları və s.) FAZA 2 və sonrakı fazalarda ediləcək.

Zəhmət olmasa işə başlamazdan əvvəl mənə qısa şəkildə planını (hansı fayl strukturunu quracağını) təqdim et, sonra kodlaşdırmağa başla.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6abc82f7-ce40-4153-b972-eee37456046d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Tamamlanmış Fazalar

### Faza 5: "Müəllim" Rolu və Rola görə Ev Səhifəsi (Dashboard)

- **DB Miqrasiyaları**: Enum tipinə `'muellim'` rolunun əlavə edilməsi, `courses` cədvəlinə `muellim_id` sütununun əlavə edilməsi, çox-çoxa `course_groups` cədvəlinin yaradılması, dekan paneli üçün `faculty_stats` və `group_stats` view-larının yazılması və bütün cədvəllərdə müvafiq RLS qaydalarının Müəllim üçün yenilənməsi.
- **Rol yoxlaması**: İstifadəçinin bütün rollarını oxuyan `useUserRoles` və əsas rolunu prioritetə görə təyin edən `usePrimaryRole` hook-larının yazılması.
- **Dinamik Naviqasiya**: Rol məhdudiyyətli "Admin Panel" (admin üçün) və "Fakültə İcmalı" (dekan üçün) linklərinin Sidebar-a əlavə edilməsi.
- **Rola görə Dashboard-lar**: Tələbə, Tyutor, Müəllim, Dekan və Admin üçün tamamilə real Supabase məlumatları və TanStack Query ilə işləyən fərqli funksional ev səhifələri qurulmuşdur.

### Faza 6: Təqvim (Calendar) Modulu

- **DB Miqrasiyası**: `calendar_events` cədvəli yaradıldı. SELECT, INSERT, UPDATE, DELETE siyasətləri RLS ilə rollara uyğun tənzimləndi (Tələbəyə yalnız oxu, digər rollara məhdudiyyətli yazma hüququ).
- **UI Komponentləri**: Aylıq grid görünüşlü `CalendarGrid`, axtarış və ay/il naviqasiyalı `MonthYearNav`, tədbir detallarını və yaradan adını göstərən `DayDetails`, Dialog və AlertDialog ilə tədbir əlavə/redaktə/sil modalı `EventFormModal` və float düymə `FloatingAddButton` yaradıldı.
- **Data qatı**: TanStack Query (`useQuery` + `useMutation`) ilə Supabase inteqrasiyası edildi. Məlumatlar seçilmiş ay və ilə görə dinamik çəkilir və keşlənir.
- **Mobil/Responsive**: Kiçik ekranlarda grid və detal hissələrinin tabs ilə keçidi təmin edildi.

### Faza 7: İmtahanlar, Davamiyyət və Qeydlər İdarəetmə Sistemi

- **DB Miqrasiyası**: `attendance` cədvəlinə `UNIQUE(user_id, course_id, tarix)` məhdudiyyəti əlavə olundu ki, eyni tarixə təkrar davamiyyət dublikatları yaranmasın. `notes` cədvəlinə `xeyr` integer sütunu və insert zamanı hər tələbə üzrə sıra nömrəsini avtomatik artıracaq BEFORE INSERT triggeri yazıldı. `note-files` storage bucket-i yaradıldı və yalnız əlaqəli şəxslərə (admin, dekan, müvafiq tyutor, müəllim və tələbənin özü) oxuma/yükləmə icazəsi verən storage RLS siyasətləri yazıldı.
- **Tələbə Görünüşü**: `imtahanlar.tsx` səhifəsində bütün fənlər üzrə cədvəl, status indikatorları ("Tamamlanıb" / "Davam edir"), klikləndikdə davamiyyət tarixçəsi və qeydlər jurnalını göstərən modal, həmçinin storage-dan signed URL ilə faylların təhlükəsiz endirilməsi quruldu.
- **Müəllim Görünüşü**: Öz fənlərini seçən dropdown, həmin fənnin tələbə siyahısı, hər sətirdə inline qiymət inputları (Semestr qiyməti, İmtahan balı), hər sətir üçün ayrıca yadda saxla və toplu "Hamısını yadda saxla" batch upsert düyməsi əlavə edildi.
- **Tyutor Görünüşü**: Davamiyyət qeydlərininCheckbox/Toggle vasitəsilə UPSERT ilə eyni gün üzrə yenilənməsi, notes jurnalı üzrə CRUD modal pəncərələri və storage-a birbaşa fayl yükləmə imkanı yaradıldı.
- **Ev Dashboard İnteqrasiyası**: Tələbənin "Ev" dashboard-undakı "Qeydlər" cədvəli və davamiyyət göstəriciləri tamamilə real backend və `note-files` bucket-inə bağlandı (tələbənin tapşırıq yükləməsi signed URL download ilə dəstəkləndi).

### Faza 8: Kitabxana (Rəqəmsal Kitabxana) Modulu — tam funksional

- **DB Miqrasiyası**: `library_books` cədvəli (`ad`, `muellif`, `kateqoriya`, `tesvir`, `uz_qabigi_url`, `fayl_url`, `format` CHECK `pdf`/`epub`, `elave_eden_id`, `elave_olunma_tarixi`) yaradıldı, axtarış/filtr üçün indekslər əlavə olundu. RLS: SELECT bütün authenticated istifadəçilərə açıqdır, INSERT/UPDATE/DELETE yalnız `has_role(auth.uid(),'admin')` və ya `'dekan'`. `library-books` (məxfi, signed URL ilə oxuma/endirmə) və `library-covers` (public, birbaşa `<img>` üçün) storage bucket-ləri + uyğun storage RLS siyasətləri quruldu.
- **Kateqoriyalar**: `src/lib/library-categories.ts` — 14 sabit kateqoriya (Roman, Şəxsi İnkişaf, Elm və Texnologiya, Tarix, Psixologiya, Detektiv və Triller, Fantaziya və Elmi Fantastika, Fəlsəfə, Uşaqlar və Gənclər, Poeziya və Ədəbiyyat, Biznes, Din, İncəsənət, Digər), hər biri lucide ikonu ilə.
- **UI Komponentləri** (`src/components/library/`): `LibraryHero` (böyük axtarış paneli, 400ms debounce + Enter dəstəyi), `CategoryGrid` (5 sütunlu dairəvi ikon+ad grid), `RecentBooks` ("Son Əlavə Olanlar", `elave_olunma_tarixi DESC LIMIT 10`, "NEW" nişanı), `BookCard` (paylaşılan kitab kartı), `BookResultsGrid` (kateqoriya/axtarış nəticələri + səhifələmə), `BookDetailModal` (üz qabığı, təsvir, "Oxu"/"Yüklə" — Storage-dan signed URL ilə), `PdfReader` (`pdfjs-dist` əsaslı, yalnız cari səhifəni lazy render edən, səhifə naviqasiyası/zoom/tam-ekran dəstəkli PDF görüntüləyici) və `AddBookForm` (yalnız admin/dekan, üz qabığı önizləməsi, 50MB fayl limiti, format fayl uzantısından avtomatik təyin olunur).
- **Route**: `src/routes/_authenticated/kitabxana.tsx` — TanStack Query ilə real Supabase sorğuları (ana səhifə: hero + kateqoriyalar + son əlavələr; kateqoriya/axtarış aktiv olduqda: geri düyməli başlıq + səhifələnmiş nəticə grid-i, axtarış həm `ad`, həm `muellif` üzrə `ILIKE` ilə işləyir).
- **`PageHeader`** komponentinə geriyə-uyğun (backward-compatible) `onGeri` prop-u əlavə olundu ki, kitabxananın kateqoriya/axtarış görünüşündəki "geri" düyməsi browser tarixçəsi əvəzinə səhifə-daxili state-i sıfırlasın (digər səhifələrin defolt `router.history.back()` davranışı dəyişmədi).

### Faza 9: Ofis (Şəxsi Fayl Anbarı) Modulu — tam funksional

- **DB Miqrasiyası**: `office_files` cədvəli (`ad`, `sahib_id`, `fayl_url`, `olcusu`, `fayl_novu`, `tarix`) yaradıldı, axtarış/sıralama üçün indekslər əlavə olundu. RLS: SELECT — sahibi, admin/dekan (bütün fayllar) və tyutor (yalnız `group_members`/`groups` üzərindən öz qrupunun tələbələrinin faylları, SELECT-only); INSERT/UPDATE/DELETE — yalnız `sahib_id = auth.uid()`. `office-files` (məxfi) storage bucket-i + `storage.foldername(name)[1] = auth.uid()::text` konvensiyasına əsaslanan storage RLS siyasətləri quruldu (hər istifadəçi yalnız öz qovluğuna yükləyə/silə bilər, oxuma icazəsi cədvəl RLS-i ilə eyni məntiqi təkrarlayır).
- **Yükləmə axını**: `src/lib/office-files.ts` — fayl ölçüsü formatlayıcı, MIME növünə görə ikon/rəng xəritəsi (PDF/Word/Excel/Şəkil/Digər) və Supabase Storage-a `XMLHttpRequest` əsaslı, real yükləmə faizini (`onprogress`) izləyən `progresLiYukle` funksiyası (supabase-js-in `fetch` əsaslı `upload()` metodu progress hadisəsi vermədiyi üçün).
- **UI Komponentləri** (`src/components/office/`): `OfficeUploadDialog` (klikləmə/sürüşdürmə ilə fayl seçimi, sürüklənəndə vurğulanma effekti, yüklənmə zamanı faiz göstəricili `Progress` zolağı, 100MB limit), `OfficeFileCard` (fayl növünə görə ikon, ad, ölçü, `formatDistanceToNow` + `az` locale ilə nisbi tarix, "Yüklə" — signed URL ilə endirmə, "Sil" — yalnız sahibinə görünən, `AlertDialog` təsdiqi ilə).
- **Route**: `src/routes/_authenticated/ofis.tsx` — axtarış paneli (400ms debounce, `ad` üzrə `ILIKE`) + "Yüklə" düyməsi, boş vəziyyət (`FileX` ikonu ilə `EmptyState`), yüklənmə zamanı skeleton kartlar, responsive grid (mobil 1, masaüstü 4 sütun). Siyahı RLS-ə əsaslanır (sahibin öz faylları + tyutor üçün əlavə olaraq qrupun tələbə faylları) — "Sil" düyməsi yalnız `fayl.sahib_id === cari_istifadəçi` olduqda göstərilir.

### Faza 10: Vercel Deployment Düzəlişi ("404: NOT_FOUND")

- **Problem**: GitHub-dan Vercel-ə deploy edildikdə bütün route-lar `404: NOT_FOUND` qaytarırdı, baxmayaraq ki, build özü uğurla keçirdi. Səbəb: layihə TanStack Start ilə SSR (server-side) tətbiqdir və build-i `@lovable.dev/vite-tanstack-config` daxilindəki Nitro plaginı aparır. Bu plagin, əgər `vite.config.ts`-də açıq şəkildə fərqli bir `preset` göstərilməzsə, defolt olaraq **Cloudflare Worker** formatında build çıxarır (`defaultPreset: "cloudflare-module"`). Vercel isə bu formatı tanımır — heç bir route-a uyğun funksiya tapmadığı üçün bütün sorğulara `404: NOT_FOUND` qaytarır.
- **Həll**: `vite.config.ts`-ə `nitro: process.env.VERCEL ? { preset: "vercel" } : undefined` əlavə olundu. Vercel-in öz build mühitində avtomatik təyin olunan `VERCEL` mühit dəyişəni aşkarlanır və yalnız o zaman Nitro-ya `"vercel"` preset-i ötürülür — bu, build nəticəsini Vercel-in **Build Output API v3** formatına (`.vercel/output/functions/__server.func/` + `.vercel/output/static/`) çevirir ki, Vercel onu avtomatik tanıyıb düzgün marşrutlaşdırsın (əlavə `vercel.json` tələb olunmur). Vercel xaricində (məs. Lovable-in öz sandbox mühiti) `VERCEL` dəyişəni mövcud olmadığı üçün defolt Cloudflare preset-i toxunulmaz qalır və heç bir başqa mühiti pozmur.
- **Yoxlama**: `VERCEL=1 npm run build` icra edildikdə `.vercel/output/config.json` (routes: `/assets/*` → cache-lənmiş statik, qalanı → `/__server` funksiyası) və `.vercel/output/functions/__server.func/.vc-config.json` (`"runtime": "nodejs22.x"`) düzgün generasiya olunduğu təsdiqləndi.

### Faza 11: Real-Time Bildiriş Sistemi — tam funksional

- **DB Miqrasiyası**: `notifications` (`profile_id`, `tip` CHECK 8 sabit dəyər, `baslıq`, `metin`, `oxunub_mu`, `tarix`, `elave_data` jsonb) və `notification_settings` (hər bildiriş növü + `e_poct_kanali`/`push_kanali` üçün boolean sütunlar, PK `profile_id`) cədvəlləri yaradıldı. RLS: `notifications` üzrə SELECT/UPDATE yalnız öz sətrinə (UPDATE-in yalnız `oxunub_mu` sahəsinə aid olması sütun-səviyyəli `GRANT UPDATE (oxunub_mu)` ilə həyata keçirildi), INSERT yalnız admin/dekan (sistemdaxili trigger-lər `SECURITY DEFINER` olaraq bundan asılı deyil); `notification_settings` üzrə hər kəs öz sətrini tam idarə edir. `handle_new_user()` yenilənərək yeni istifadəçi üçün defolt parametr sətri yaradır, mövcud istifadəçilər üçün geriyə doldurma (backfill) skripti işə salındı. `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications` ilə Realtime aktivləşdirildi.
- **Avtomatik Bildiriş Trigger-ləri**: Yeni `calendar_events` sətri yarananda aid qrupun üzvlərinə (istifadəçinin `tedbir` parametri açıqdırsa) `'tedbir'` tipli bildiriş; `exam_scores`-da `yekun_qiymet` UPDATE ilə doldurulanda tələbəyə (`sistem` parametri açıqdırsa) `'sistem'` tipli bildiriş yaradan `SECURITY DEFINER` funksiyaları və trigger-ləri quruldu. `chat_messages` üçün bildiriş funksiyasının strukturu yazıldı, lakin spam-in qarşısını almaq üçün QƏSDƏN heç bir trigger-ə bağlanmadı (gələcək fazada offline-yoxlama məntiqi ilə aktivləşdiriləcək).
- **Admin Broadcast**: `public.broadcast_notification(p_tip, p_baslıq, p_metin, p_hedef_rol, p_hedef_qrup)` — `SECURITY DEFINER`, funksiya daxilində admin/dekan yoxlaması ilə — "Bütün istifadəçilər" / "Seçilmiş rol" / "Seçilmiş qrup" üzrə toplu bildiriş göndərir və göndərilən sətir sayını qaytarır.
- **UI Komponentləri**: `src/hooks/use-notifications.ts` — `postgres_changes` (INSERT/UPDATE) ilə real-time abunəlik, oxunmamış say, tək/hamısını oxunmuş et mutasiyaları. `src/lib/notification-types.ts` — bildiriş tipinə görə rəngli ikon xəritəsi. `bildirisler.tsx` səhifəsi tam real-time siyahıya çevrildi (oxunmamış = mavi nöqtə + fərqli fon, klikləmə ilə oxunmuş işarələmə, "Hamısını oxunmuş et" düyməsi). `menyu/bildiris.tsx`-dəki bütün toggle-lar `notification_settings`-ə optimistic UI ilə birbaşa bağlandı. `Sidebar.tsx`-dəki Bell ikonuna (həm masaüstü, həm mobil naviqasiyada) qırmızı say badge-i (`9+`-dan çoxu üçün) əlavə olundu. Admin Panel-ə (yalnız admin/dekan rolunda görünən) `BroadcastNotificationDialog` komponenti — başlıq, mətn, tip `Select`-i, alıcı `RadioGroup`-u (Bütün istifadəçilər/Rol/Qrup) — inteqrasiya edildi.
