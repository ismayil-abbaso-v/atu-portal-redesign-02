export const ACTIVITY_OPERATION_LABELS: Record<string, string> = {
  giris_edildi: "Giriş Edildi",
  sessiya_sonlandirildi: "Sessiya Sonlandırıldı",
  sehife_acildi: "Səhifə Açıldı",
  bildirisler_oxundu: "Bildirişlər Oxundu",
  profil_yenilendi: "Profil Yeniləndi",
  qrup_yaradildi: "Qrup Yaradıldı",
  qrup_yenilendi: "Qrup Yeniləndi",
  qrup_silindi: "Qrup Silindi",
  fenn_yaradildi: "Fənn Yaradıldı",
  fenn_yenilendi: "Fənn Yeniləndi",
  fenn_silindi: "Fənn Silindi",
  kitab_elave_edildi: "Kitab Əlavə Edildi",
  kitab_yenilendi: "Kitab Yeniləndi",
  kitab_silindi: "Kitab Silindi",
  fayl_yuklendi: "Fayl Yükləndi",
  fayl_silindi: "Fayl Silindi",
  qrup_uzvu_elave_edildi: "Qrup Üzvü Əlavə Edildi",
  qrup_uzvu_silindi: "Qrup Üzvü Silindi",
  muellim_teyin_edildi: "Müəllim Təyin Edildi",
  muellim_teyini_yenilendi: "Müəllim Təyinatı Yeniləndi",
  muellim_teyini_silindi: "Müəllim Təyinatı Silindi",
  movzu_elave_edildi: "Mövzu Əlavə Edildi",
  movzu_yenilendi: "Mövzu Yeniləndi",
  movzu_silindi: "Mövzu Silindi",
  rol_elave_edildi: "Rol Əlavə Edildi",
  rol_yenilendi: "Rol Yeniləndi",
  rol_silindi: "Rol Silindi",
  sistem_tenzimlemesi_yenilendi: "Sistem Tənzimləməsi Yeniləndi",
  jurnal_sessiyasi_kilidi_acildi: "Jurnal Sessiyasının Kilidi Açıldı",
  elan_yaradildi: "Elan Yaradıldı",
  elan_yenilendi: "Elan Yeniləndi",
  elan_silindi: "Elan Silindi",
};

export const ACTIVITY_OPERATION_OPTIONS = Object.entries(ACTIVITY_OPERATION_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "az"));

export function getActivityOperationLabel(operation: string) {
  return ACTIVITY_OPERATION_LABELS[operation] ?? operation.replaceAll("_", " ");
}
