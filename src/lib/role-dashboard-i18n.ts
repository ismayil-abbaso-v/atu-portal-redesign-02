import { useCallback } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

type Vars = Record<string, string | number>;

const az = {
  "common.group": "Qrup",
  "common.course": "Fənn",
  "common.student": "Tələbə",
  "common.students": "Tələbələr",
  "common.attendance": "Davamiyyət",
  "common.grade": "Qiymət",
  "common.date": "Tarix",
  "common.topic": "Mövzu",
  "common.saveAll": "Hamısını yadda saxla",
  "common.confirmAll": "Hamısını təsdiqlə",
  "common.viewFile": "Fayla bax",
  "common.noFile": "Fayl təqdim edilməyib",
  "common.present": "İştirak edib",
  "common.absent": "Qayıb",
  "common.close": "Bağla",
  "common.save": "Yadda saxla",
  "common.cancel": "Ləğv et",
  "common.active": "Aktiv",
  "common.confirmed": "Təsdiqlənib",
  "common.credit": "Kredit",
  "common.room": "Otaq",
  "common.type": "Növ",
  "common.lesson": "Dərs",
  "common.loading": "Yüklənir...",
  "common.error": "Xəta baş verdi.",
  "common.cabinet": "Kabinet",

  "teacher.homeTitle": "Müəllim kabineti",
  "teacher.heroBadge": "Tədris idarəetməsi",
  "teacher.heroTitle": "Qrup → fənn → jurnal",
  "teacher.heroDescription": "Əvvəl tədris etdiyiniz qrupu, sonra həmin qrupda keçdiyiniz fənni seçin. Davamiyyət və bütün qiymətləndirmə alətləri vahid, sadə iş panelində açılır.",
  "teacher.groupsTitle": "Tədris etdiyiniz qruplar",
  "teacher.groupsHint": "Fənnləri görmək üçün qrupu seçin.",
  "teacher.noGroupsTitle": "Sizə tədris qrupu təyin edilməyib",
  "teacher.noGroupsDescription": "Fənn müəllimliyi təyin edildikdən və fənn qrupa bağlandıqdan sonra burada avtomatik görünəcək.",
  "teacher.courseCount": "{count} fənn",
  "teacher.studentCount": "{count} tələbə",
  "teacher.selectedGroupBadge": "Seçilmiş qrup",
  "teacher.selectedGroupTitle": "{group} üzrə fənləriniz",
  "teacher.selectedGroupHint": "Bir qrupa bir neçə fənn tədris edirsinizsə, onların hamısı ayrıca göstərilir.",
  "teacher.openWorkspace": "Jurnalı aç",
  "teacher.noCoursesInGroup": "Bu qrup üzrə sizə fənn təyin edilməyib.",

  "teacher.workspaceDeniedTitle": "Fənn panelinə giriş mümkün olmadı",
  "teacher.workspaceDeniedDescription": "Bu qrup və fənn üzrə müəllim təyinatınızı yoxlayın. Səhifə yalnız həmin fənnə təyin edilmiş müəllim üçün açılır.",
  "teacher.backCabinet": "Müəllim kabinetinə qayıt",
  "teacher.workspaceDescription": "Bu panel yalnız seçilmiş qrup və fənn üçündür. Davamiyyət, gündəlik qiymət, sərbəst iş, kollokvium və kurs işi bir yerdə idarə olunur.",
  "teacher.practice": "Məşğələ",
  "teacher.lab": "Lab",
  "teacher.dailyTab": "Gündəlik jurnal",
  "teacher.independentTab": "Sərbəst iş",
  "teacher.colloquiumTab": "Kollokvium",
  "teacher.courseworkTab": "Kurs işi",
  "teacher.dailyTitle": "Gündəlik jurnal",
  "teacher.dailyHint": "Davamiyyət və gündəlik qiymətləndirmə yalnız sizə təyin edilmiş dərs sessiyasında aparılır.",
  "teacher.activeLesson": "Aktiv dərs",
  "teacher.noActiveLesson": "Aktiv dərs yoxdur",
  "teacher.noSessionTitle": "Bu qrup üzrə sizə dərs sessiyası təyin edilməyib",
  "teacher.noSessionDescription": "Fənnə müəllim kimi qoşulmağınız düzgündür, lakin gündəlik jurnal üçün dərs cədvəlində konkret sessiyanın müəllimi də siz olmalısınız.",
  "teacher.session": "Dərs sessiyası",
  "teacher.gradingOpen": "Qiymətləndirmə açıqdır",
  "teacher.gradingClosed": "Vaxt pəncərəsi bağlıdır",
  "teacher.topicPlaceholder": "Bu gün keçirilən mövzunu yazın...",
  "teacher.submitted": "Təhvil verib",
  "teacher.topicRequired": "Dərsin mövzusunu daxil edin.",
  "teacher.attendanceRequired": "Bütün tələbələrin davamiyyətini seçin.",
  "teacher.gradeRangeStudent": "{student}: qiymət 0-{max} aralığında olmalıdır.",
  "teacher.confirmFailed": "Dərs təsdiqlənmədi.",
  "teacher.confirmSuccess": "Dərs təsdiqləndi və jurnal kilidləndi.",
  "teacher.independentTitle": "Sərbəst iş qiymətləndirməsi",
  "teacher.independentHint": "Sərbəst işi seçin və bütün qrupun qiymətlərini bir cədvəldə daxil edin.",
  "teacher.courseworkTitle": "Kurs işi qiymətləndirməsi",
  "teacher.courseworkHint": "Qrupun kurs işi qiymətlərini vahid siyahıda idarə edin.",
  "teacher.independentWork": "Sərbəst iş",
  "teacher.independentWorkN": "Sərbəst iş {n}",
  "teacher.permissionMissing": "Bu qiymətləndirmə növü üçün sizə müəllim icazəsi verilməyib.",
  "teacher.permissionReadonly": "Bu bölmə görünür, lakin fənn üzrə uyğun müəllim icazəsi aktiv olmadığı üçün qiymətləri dəyişmək mümkün deyil.",
  "teacher.noStudentsTitle": "Qrupda tələbə yoxdur",
  "teacher.noStudentsDescription": "Qrup üzvləri əlavə edildikdən sonra qiymətləndirmə cədvəli avtomatik yaranacaq.",
  "teacher.submission": "Təqdimat",
  "teacher.batchHint": "{count} tələbə · dəyişikliklər yalnız “Hamısını yadda saxla” ilə yazılır.",
  "teacher.noChanges": "Yadda saxlanılacaq qiymət yoxdur.",
  "teacher.batchSaved": "{work} üzrə qiymətlər yadda saxlanıldı.",
  "teacher.colloquiumTitle": "Kollokvium qiymətləndirməsi",
  "teacher.colloquiumHint": "Kollokviumu seçin və bütün tələbələrin tarix/qiymət məlumatını eyni cədvəldə daxil edin.",
  "teacher.colloquium": "Kollokvium",
  "teacher.colloquiumN": "Kollokvium {n}",
  "teacher.colloquiumPermission": "Bu fənn üzrə kollokvium icazəniz aktiv deyil.",
  "teacher.colloquiumPermissionError": "Kollokvium qiymətləndirməsi üçün sizə icazə verilməyib.",
  "teacher.noColloquiumData": "Yadda saxlanılacaq məlumat yoxdur.",
  "teacher.colloquiumSaved": "Kollokvium {n} üzrə məlumatlar yadda saxlanıldı.",
  "teacher.fileOpenError": "Fayl açıla bilmədi.",

  "tutor.homeTitle": "Tyutor kabineti",
  "tutor.heroBadge": "Akademik müşayiət",
  "tutor.heroTitle": "Qruplarınızı bir mərkəzdən idarə edin",
  "tutor.heroDescription": "Rəhbərlik etdiyiniz qrupları, tələbələri, fənləri və davamiyyət vəziyyətini aydın şəkildə izləyin. Sürətli əməliyyatlar yalnız seçilmiş qrup kontekstində aparılır.",
  "tutor.groupsTitle": "Rəhbərlik etdiyiniz qruplar",
  "tutor.groupsHint": "Detalları görmək üçün qrupu seçin.",
  "tutor.noGroupsTitle": "Rəhbərlik etdiyiniz qrup tapılmadı",
  "tutor.noGroupsDescription": "Tyutor təyinatı edildikdən sonra qruplar burada avtomatik görünəcək.",
  "tutor.overview": "Qrup icmalı",
  "tutor.courseCount": "{count} fənn",
  "tutor.studentCount": "{count} tələbə",
  "tutor.avgAttendance": "Ortalama davamiyyət",
  "tutor.manageGroup": "Qrupu idarə et",
  "tutor.quickAttendance": "Davamiyyət əlavə et",
  "tutor.addNote": "Qeyd əlavə et",
  "tutor.courses": "Qrupun fənləri",
  "tutor.students": "Qrupun tələbələri",
  "tutor.noCourses": "Bu qrupa hələ fənn əlavə edilməyib.",
  "tutor.noStudents": "Bu qrupda tələbə yoxdur.",
  "tutor.moreStudents": "+{count} digər tələbə",
  "tutor.attendanceModal": "Davamiyyət qeyd et",
  "tutor.noteModal": "Qeyd əlavə et",
  "tutor.chooseStudent": "Tələbə seçin",
  "tutor.chooseCourse": "Fənn seçin",
  "tutor.attendanceStatus": "Davamiyyət statusu",
  "tutor.present": "Dərsdə iştirak edir",
  "tutor.absent": "Qayıb",
  "tutor.noteTopic": "Mövzu",
  "tutor.noteText": "Qeyd",
  "tutor.noteTopicPlaceholder": "Qeydin mövzusu...",
  "tutor.notePlaceholder": "Qısa və aydın qeyd yazın...",
  "tutor.studentCourseRequired": "Zəhmət olmasa tələbə və fənni seçin.",
  "tutor.attendanceSaved": "Davamiyyət uğurla qeyd olundu.",
  "tutor.noteSaved": "Qeyd uğurla jurnala yazıldı.",
} as const;

export type RoleDashboardKey = keyof typeof az;

type Dict = Record<RoleDashboardKey, string>;

const tr: Dict = {
  "common.group":"Grup","common.course":"Ders","common.student":"Öğrenci","common.students":"Öğrenciler","common.attendance":"Devamlılık","common.grade":"Not","common.date":"Tarih","common.topic":"Konu","common.saveAll":"Tümünü kaydet","common.confirmAll":"Tümünü onayla","common.viewFile":"Dosyayı görüntüle","common.noFile":"Dosya gönderilmedi","common.present":"Katıldı","common.absent":"Devamsız","common.close":"Kapat","common.save":"Kaydet","common.cancel":"İptal","common.active":"Aktif","common.confirmed":"Onaylandı","common.credit":"Kredi","common.room":"Oda","common.type":"Tür","common.lesson":"Ders","common.loading":"Yükleniyor...","common.error":"Bir hata oluştu.","common.cabinet":"Panel",
  "teacher.homeTitle":"Öğretmen paneli","teacher.heroBadge":"Eğitim yönetimi","teacher.heroTitle":"Grup → ders → günlük","teacher.heroDescription":"Önce ders verdiğiniz grubu, ardından o grupta verdiğiniz dersi seçin. Devamlılık ve tüm değerlendirme araçları tek ve sade bir çalışma panelinde açılır.","teacher.groupsTitle":"Ders verdiğiniz gruplar","teacher.groupsHint":"Dersleri görmek için grubu seçin.","teacher.noGroupsTitle":"Size atanmış bir eğitim grubu yok","teacher.noGroupsDescription":"Ders öğretmeni atandıktan ve ders gruba bağlandıktan sonra burada otomatik görünür.","teacher.courseCount":"{count} ders","teacher.studentCount":"{count} öğrenci","teacher.selectedGroupBadge":"Seçili grup","teacher.selectedGroupTitle":"{group} dersleriniz","teacher.selectedGroupHint":"Aynı grupta birden fazla ders veriyorsanız hepsi ayrı ayrı gösterilir.","teacher.openWorkspace":"Günlüğü aç","teacher.noCoursesInGroup":"Bu grupta size atanmış ders yok.",
  "teacher.workspaceDeniedTitle":"Ders paneline erişilemedi","teacher.workspaceDeniedDescription":"Bu grup ve ders için öğretmen atamanızı kontrol edin. Sayfa yalnız bu derse atanmış öğretmene açıktır.","teacher.backCabinet":"Öğretmen paneline dön","teacher.workspaceDescription":"Bu panel yalnız seçili grup ve ders içindir. Devamlılık, günlük not, bağımsız çalışma, kolokyum ve ders projesi tek yerde yönetilir.","teacher.practice":"Uygulama","teacher.lab":"Lab","teacher.dailyTab":"Günlük","teacher.independentTab":"Bağımsız çalışma","teacher.colloquiumTab":"Kolokyum","teacher.courseworkTab":"Ders projesi","teacher.dailyTitle":"Günlük","teacher.dailyHint":"Devamlılık ve günlük değerlendirme yalnız size atanmış ders oturumunda yapılır.","teacher.activeLesson":"Aktif ders","teacher.noActiveLesson":"Aktif ders yok","teacher.noSessionTitle":"Bu grup için size atanmış ders oturumu yok","teacher.noSessionDescription":"Derse öğretmen olarak bağlısınız ancak günlük için ders programındaki ilgili oturumun öğretmeni de siz olmalısınız.","teacher.session":"Ders oturumu","teacher.gradingOpen":"Değerlendirme açık","teacher.gradingClosed":"Zaman penceresi kapalı","teacher.topicPlaceholder":"Bugün işlenen konuyu yazın...","teacher.submitted":"Teslim edildi","teacher.topicRequired":"Ders konusunu girin.","teacher.attendanceRequired":"Tüm öğrencilerin devam durumunu seçin.","teacher.gradeRangeStudent":"{student}: not 0-{max} aralığında olmalıdır.","teacher.confirmFailed":"Ders onaylanamadı.","teacher.confirmSuccess":"Ders onaylandı ve günlük kilitlendi.","teacher.independentTitle":"Bağımsız çalışma değerlendirmesi","teacher.independentHint":"Çalışmayı seçin ve tüm grubun notlarını tek tabloda girin.","teacher.courseworkTitle":"Ders projesi değerlendirmesi","teacher.courseworkHint":"Grubun proje notlarını tek listede yönetin.","teacher.independentWork":"Bağımsız çalışma","teacher.independentWorkN":"Bağımsız çalışma {n}","teacher.permissionMissing":"Bu değerlendirme türü için öğretmen izniniz yok.","teacher.permissionReadonly":"Bu bölüm görüntülenebilir ancak ilgili öğretmen izni aktif olmadığı için notlar değiştirilemez.","teacher.noStudentsTitle":"Grupta öğrenci yok","teacher.noStudentsDescription":"Grup üyeleri eklendiğinde değerlendirme tablosu otomatik oluşur.","teacher.submission":"Teslim","teacher.batchHint":"{count} öğrenci · değişiklikler yalnız “Tümünü kaydet” ile yazılır.","teacher.noChanges":"Kaydedilecek not yok.","teacher.batchSaved":"{work} notları kaydedildi.","teacher.colloquiumTitle":"Kolokyum değerlendirmesi","teacher.colloquiumHint":"Kolokyumu seçin ve tüm öğrencilerin tarih/not bilgisini tek tabloda girin.","teacher.colloquium":"Kolokyum","teacher.colloquiumN":"Kolokyum {n}","teacher.colloquiumPermission":"Bu ders için kolokyum izniniz aktif değil.","teacher.colloquiumPermissionError":"Kolokyum değerlendirmesi için izniniz yok.","teacher.noColloquiumData":"Kaydedilecek bilgi yok.","teacher.colloquiumSaved":"Kolokyum {n} bilgileri kaydedildi.","teacher.fileOpenError":"Dosya açılamadı.",
  "tutor.homeTitle":"Tutor paneli","tutor.heroBadge":"Akademik rehberlik","tutor.heroTitle":"Gruplarınızı tek merkezden yönetin","tutor.heroDescription":"Sorumlu olduğunuz grupları, öğrencileri, dersleri ve devam durumunu açık şekilde izleyin. Hızlı işlemler yalnız seçili grup bağlamında yapılır.","tutor.groupsTitle":"Sorumlu olduğunuz gruplar","tutor.groupsHint":"Detayları görmek için grubu seçin.","tutor.noGroupsTitle":"Sorumlu olduğunuz grup bulunamadı","tutor.noGroupsDescription":"Tutor ataması yapıldığında gruplar burada otomatik görünür.","tutor.overview":"Grup özeti","tutor.courseCount":"{count} ders","tutor.studentCount":"{count} öğrenci","tutor.avgAttendance":"Ortalama devamlılık","tutor.manageGroup":"Grubu yönet","tutor.quickAttendance":"Devamlılık ekle","tutor.addNote":"Not ekle","tutor.courses":"Grubun dersleri","tutor.students":"Grubun öğrencileri","tutor.noCourses":"Bu gruba henüz ders eklenmedi.","tutor.noStudents":"Bu grupta öğrenci yok.","tutor.moreStudents":"+{count} diğer öğrenci","tutor.attendanceModal":"Devamlılık kaydet","tutor.noteModal":"Not ekle","tutor.chooseStudent":"Öğrenci seçin","tutor.chooseCourse":"Ders seçin","tutor.attendanceStatus":"Devam durumu","tutor.present":"Derse katıldı","tutor.absent":"Devamsız","tutor.noteTopic":"Konu","tutor.noteText":"Not","tutor.noteTopicPlaceholder":"Not konusu...","tutor.notePlaceholder":"Kısa ve açık bir not yazın...","tutor.studentCourseRequired":"Lütfen öğrenci ve ders seçin.","tutor.attendanceSaved":"Devamlılık başarıyla kaydedildi.","tutor.noteSaved":"Not günlüğe başarıyla yazıldı."
};

const en: Dict = {
  "common.group":"Group","common.course":"Course","common.student":"Student","common.students":"Students","common.attendance":"Attendance","common.grade":"Grade","common.date":"Date","common.topic":"Topic","common.saveAll":"Save all","common.confirmAll":"Confirm all","common.viewFile":"View file","common.noFile":"No file submitted","common.present":"Present","common.absent":"Absent","common.close":"Close","common.save":"Save","common.cancel":"Cancel","common.active":"Active","common.confirmed":"Confirmed","common.credit":"Credit","common.room":"Room","common.type":"Type","common.lesson":"Lesson","common.loading":"Loading...","common.error":"An error occurred.","common.cabinet":"Dashboard",
  "teacher.homeTitle":"Teacher dashboard","teacher.heroBadge":"Teaching management","teacher.heroTitle":"Group → course → journal","teacher.heroDescription":"Choose the group you teach first, then select your course in that group. Attendance and all assessment tools open in one clear workspace.","teacher.groupsTitle":"Groups you teach","teacher.groupsHint":"Select a group to view its courses.","teacher.noGroupsTitle":"No teaching group is assigned to you","teacher.noGroupsDescription":"Once you are assigned to a course and the course is linked to a group, it will appear here automatically.","teacher.courseCount":"{count} courses","teacher.studentCount":"{count} students","teacher.selectedGroupBadge":"Selected group","teacher.selectedGroupTitle":"Your courses in {group}","teacher.selectedGroupHint":"If you teach multiple courses to the same group, each course is shown separately.","teacher.openWorkspace":"Open journal","teacher.noCoursesInGroup":"No course is assigned to you in this group.",
  "teacher.workspaceDeniedTitle":"Course workspace could not be opened","teacher.workspaceDeniedDescription":"Check your teacher assignment for this group and course. The page is available only to teachers assigned to the course.","teacher.backCabinet":"Back to teacher dashboard","teacher.workspaceDescription":"This workspace is scoped to the selected group and course. Attendance, daily grading, independent work, colloquiums and coursework are managed in one place.","teacher.practice":"Practice","teacher.lab":"Lab","teacher.dailyTab":"Daily journal","teacher.independentTab":"Independent work","teacher.colloquiumTab":"Colloquium","teacher.courseworkTab":"Coursework","teacher.dailyTitle":"Daily journal","teacher.dailyHint":"Attendance and daily grading are available only inside a lesson session assigned to you.","teacher.activeLesson":"Active lesson","teacher.noActiveLesson":"No active lesson","teacher.noSessionTitle":"No lesson session is assigned to you for this group","teacher.noSessionDescription":"You are assigned to the course, but the specific timetable session must also be assigned to you for daily journal access.","teacher.session":"Lesson session","teacher.gradingOpen":"Grading is open","teacher.gradingClosed":"Time window is closed","teacher.topicPlaceholder":"Enter today's lesson topic...","teacher.submitted":"Submitted","teacher.topicRequired":"Enter the lesson topic.","teacher.attendanceRequired":"Select attendance for every student.","teacher.gradeRangeStudent":"{student}: grade must be between 0 and {max}.","teacher.confirmFailed":"The lesson could not be confirmed.","teacher.confirmSuccess":"The lesson was confirmed and the journal was locked.","teacher.independentTitle":"Independent work assessment","teacher.independentHint":"Choose the work and enter the whole group's grades in one table.","teacher.courseworkTitle":"Coursework assessment","teacher.courseworkHint":"Manage the group's coursework grades in a single list.","teacher.independentWork":"Independent work","teacher.independentWorkN":"Independent work {n}","teacher.permissionMissing":"You do not have permission for this assessment type.","teacher.permissionReadonly":"This section is visible, but grades cannot be changed because the required teacher permission is not enabled.","teacher.noStudentsTitle":"No students in this group","teacher.noStudentsDescription":"The assessment table appears automatically after students are added to the group.","teacher.submission":"Submission","teacher.batchHint":"{count} students · changes are written only when you choose “Save all”.","teacher.noChanges":"There are no grades to save.","teacher.batchSaved":"Grades for {work} were saved.","teacher.colloquiumTitle":"Colloquium assessment","teacher.colloquiumHint":"Choose a colloquium and enter dates and grades for the whole group in one table.","teacher.colloquium":"Colloquium","teacher.colloquiumN":"Colloquium {n}","teacher.colloquiumPermission":"Colloquium permission is not enabled for this course.","teacher.colloquiumPermissionError":"You do not have permission to grade colloquiums.","teacher.noColloquiumData":"There is no data to save.","teacher.colloquiumSaved":"Colloquium {n} data was saved.","teacher.fileOpenError":"The file could not be opened.",
  "tutor.homeTitle":"Tutor dashboard","tutor.heroBadge":"Academic guidance","tutor.heroTitle":"Manage your groups from one place","tutor.heroDescription":"Clearly monitor the groups you advise, their students, courses and attendance. Quick actions always stay inside the selected group context.","tutor.groupsTitle":"Groups you advise","tutor.groupsHint":"Select a group to view its details.","tutor.noGroupsTitle":"No group is assigned to you","tutor.noGroupsDescription":"Groups will appear here automatically after a tutor assignment is created.","tutor.overview":"Group overview","tutor.courseCount":"{count} courses","tutor.studentCount":"{count} students","tutor.avgAttendance":"Average attendance","tutor.manageGroup":"Manage group","tutor.quickAttendance":"Add attendance","tutor.addNote":"Add note","tutor.courses":"Group courses","tutor.students":"Group students","tutor.noCourses":"No course has been added to this group yet.","tutor.noStudents":"There are no students in this group.","tutor.moreStudents":"+{count} more students","tutor.attendanceModal":"Record attendance","tutor.noteModal":"Add note","tutor.chooseStudent":"Choose a student","tutor.chooseCourse":"Choose a course","tutor.attendanceStatus":"Attendance status","tutor.present":"Present in class","tutor.absent":"Absent","tutor.noteTopic":"Topic","tutor.noteText":"Note","tutor.noteTopicPlaceholder":"Note topic...","tutor.notePlaceholder":"Write a short, clear note...","tutor.studentCourseRequired":"Please select a student and course.","tutor.attendanceSaved":"Attendance was saved successfully.","tutor.noteSaved":"The note was added to the journal successfully."
};

const ru: Dict = {
  "common.group":"Группа","common.course":"Предмет","common.student":"Студент","common.students":"Студенты","common.attendance":"Посещаемость","common.grade":"Оценка","common.date":"Дата","common.topic":"Тема","common.saveAll":"Сохранить всё","common.confirmAll":"Подтвердить всё","common.viewFile":"Открыть файл","common.noFile":"Файл не отправлен","common.present":"Присутствовал","common.absent":"Отсутствовал","common.close":"Закрыть","common.save":"Сохранить","common.cancel":"Отмена","common.active":"Активно","common.confirmed":"Подтверждено","common.credit":"Кредит","common.room":"Аудитория","common.type":"Тип","common.lesson":"Занятие","common.loading":"Загрузка...","common.error":"Произошла ошибка.","common.cabinet":"Кабинет",
  "teacher.homeTitle":"Кабинет преподавателя","teacher.heroBadge":"Управление преподаванием","teacher.heroTitle":"Группа → предмет → журнал","teacher.heroDescription":"Сначала выберите группу, в которой вы преподаёте, затем предмет. Посещаемость и все инструменты оценивания открываются в одном понятном рабочем пространстве.","teacher.groupsTitle":"Ваши учебные группы","teacher.groupsHint":"Выберите группу, чтобы увидеть предметы.","teacher.noGroupsTitle":"Вам не назначена учебная группа","teacher.noGroupsDescription":"После назначения преподавателем и привязки предмета к группе она появится здесь автоматически.","teacher.courseCount":"{count} предметов","teacher.studentCount":"{count} студентов","teacher.selectedGroupBadge":"Выбранная группа","teacher.selectedGroupTitle":"Ваши предметы в группе {group}","teacher.selectedGroupHint":"Если вы ведёте несколько предметов в одной группе, каждый из них отображается отдельно.","teacher.openWorkspace":"Открыть журнал","teacher.noCoursesInGroup":"В этой группе вам не назначен предмет.",
  "teacher.workspaceDeniedTitle":"Не удалось открыть панель предмета","teacher.workspaceDeniedDescription":"Проверьте назначение преподавателя для этой группы и предмета. Страница доступна только назначенному преподавателю.","teacher.backCabinet":"Вернуться в кабинет преподавателя","teacher.workspaceDescription":"Панель относится только к выбранной группе и предмету. Посещаемость, ежедневные оценки, самостоятельные работы, коллоквиумы и курсовая работа управляются в одном месте.","teacher.practice":"Практика","teacher.lab":"Лаб.","teacher.dailyTab":"Ежедневный журнал","teacher.independentTab":"Самостоятельная работа","teacher.colloquiumTab":"Коллоквиум","teacher.courseworkTab":"Курсовая работа","teacher.dailyTitle":"Ежедневный журнал","teacher.dailyHint":"Посещаемость и ежедневное оценивание доступны только в занятии, назначенном вам.","teacher.activeLesson":"Активное занятие","teacher.noActiveLesson":"Нет активного занятия","teacher.noSessionTitle":"Для этой группы вам не назначено занятие","teacher.noSessionDescription":"Вы назначены преподавателем предмета, но для ежедневного журнала конкретное занятие в расписании также должно быть назначено вам.","teacher.session":"Занятие","teacher.gradingOpen":"Оценивание открыто","teacher.gradingClosed":"Временное окно закрыто","teacher.topicPlaceholder":"Введите тему сегодняшнего занятия...","teacher.submitted":"Сдано","teacher.topicRequired":"Введите тему занятия.","teacher.attendanceRequired":"Укажите посещаемость всех студентов.","teacher.gradeRangeStudent":"{student}: оценка должна быть от 0 до {max}.","teacher.confirmFailed":"Не удалось подтвердить занятие.","teacher.confirmSuccess":"Занятие подтверждено, журнал заблокирован.","teacher.independentTitle":"Оценивание самостоятельной работы","teacher.independentHint":"Выберите работу и внесите оценки всей группы в одной таблице.","teacher.courseworkTitle":"Оценивание курсовой работы","teacher.courseworkHint":"Управляйте оценками курсовой работы всей группы в одном списке.","teacher.independentWork":"Самостоятельная работа","teacher.independentWorkN":"Самостоятельная работа {n}","teacher.permissionMissing":"У вас нет разрешения для этого вида оценивания.","teacher.permissionReadonly":"Раздел доступен для просмотра, но оценки нельзя изменить без соответствующего разрешения преподавателя.","teacher.noStudentsTitle":"В группе нет студентов","teacher.noStudentsDescription":"Таблица оценивания появится автоматически после добавления студентов.","teacher.submission":"Сдача","teacher.batchHint":"{count} студентов · изменения записываются только кнопкой «Сохранить всё».","teacher.noChanges":"Нет оценок для сохранения.","teacher.batchSaved":"Оценки за {work} сохранены.","teacher.colloquiumTitle":"Оценивание коллоквиума","teacher.colloquiumHint":"Выберите коллоквиум и внесите даты и оценки всей группы в одной таблице.","teacher.colloquium":"Коллоквиум","teacher.colloquiumN":"Коллоквиум {n}","teacher.colloquiumPermission":"Разрешение на коллоквиум для этого предмета не включено.","teacher.colloquiumPermissionError":"У вас нет разрешения на оценивание коллоквиума.","teacher.noColloquiumData":"Нет данных для сохранения.","teacher.colloquiumSaved":"Данные коллоквиума {n} сохранены.","teacher.fileOpenError":"Не удалось открыть файл.",
  "tutor.homeTitle":"Кабинет тьютора","tutor.heroBadge":"Академическое сопровождение","tutor.heroTitle":"Управляйте группами из одного центра","tutor.heroDescription":"Удобно отслеживайте свои группы, студентов, предметы и посещаемость. Быстрые действия всегда выполняются в контексте выбранной группы.","tutor.groupsTitle":"Ваши группы","tutor.groupsHint":"Выберите группу, чтобы увидеть детали.","tutor.noGroupsTitle":"У вас нет назначенной группы","tutor.noGroupsDescription":"После назначения тьютора группы автоматически появятся здесь.","tutor.overview":"Обзор группы","tutor.courseCount":"{count} предметов","tutor.studentCount":"{count} студентов","tutor.avgAttendance":"Средняя посещаемость","tutor.manageGroup":"Управление группой","tutor.quickAttendance":"Добавить посещаемость","tutor.addNote":"Добавить заметку","tutor.courses":"Предметы группы","tutor.students":"Студенты группы","tutor.noCourses":"В эту группу пока не добавлен предмет.","tutor.noStudents":"В группе нет студентов.","tutor.moreStudents":"+{count} других студентов","tutor.attendanceModal":"Отметить посещаемость","tutor.noteModal":"Добавить заметку","tutor.chooseStudent":"Выберите студента","tutor.chooseCourse":"Выберите предмет","tutor.attendanceStatus":"Статус посещаемости","tutor.present":"Присутствует на занятии","tutor.absent":"Отсутствует","tutor.noteTopic":"Тема","tutor.noteText":"Заметка","tutor.noteTopicPlaceholder":"Тема заметки...","tutor.notePlaceholder":"Напишите краткую и понятную заметку...","tutor.studentCourseRequired":"Выберите студента и предмет.","tutor.attendanceSaved":"Посещаемость успешно сохранена.","tutor.noteSaved":"Заметка успешно добавлена в журнал."
};

const dictionaries: Record<Locale, Dict> = { az, tr, en, ru };
const localeTags: Record<Locale, string> = { az: "az-AZ", tr: "tr-TR", en: "en-US", ru: "ru-RU" };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function useRoleDashboardI18n() {
  const { locale } = useI18n();
  const t = useCallback(
    (key: RoleDashboardKey, vars?: Vars) => interpolate(dictionaries[locale][key] ?? en[key] ?? key, vars),
    [locale],
  );
  const formatDate = useCallback(
    (value: string | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)),
    [locale],
  );
  const formatTime = useCallback(
    (value: string | Date) => new Intl.DateTimeFormat(localeTags[locale], { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)),
    [locale],
  );
  return { locale, t, formatDate, formatTime };
}
