// ============================================================================
// photoUrl — SSOT สำหรับ URL รูปสินค้า (เสิร์ฟfrom network file share ผ่าน Photo Bridge)
// ----------------------------------------------------------------------------
// รูปAllในSystemดึงfrom network path (\\chongdts\Chong Photo\...) ผ่าน backend
// endpoint /api/photos/ps|cad/:itemNo (server.js — unauthenticated, res.sendFile)
// เลิกใช้ base64 (VARBINARY from GMItemPhoto) แล้วทั้งSystem
//
// ใช้ relative path เพื่อให้ผ่าน Vite proxy (/api -> :3001) ได้ทุก host บน LAN
// (pattern เดียวกับ TopOrdersGalleryPage) — <img> ไม่ต้องแนบ token เพราะ Photo Bridge
// ไม่ได้อยู่หลัง auth middleware
//
// การใช้Workมาตรฐาน: ลอง ps ก่อน ถ้าไฟล์ไม่เจอให้ onError fallback ไป cad
// (ใช้ helper attachPhotoFallback เพื่อไม่ต้องเขียน onError ซ้ำในหลายที่)
// ============================================================================

export const psPhotoUrl = (itemNo?: string | null): string =>
  itemNo ? `/api/photos/ps/${encodeURIComponent(itemNo)}` : '';

export const cadPhotoUrl = (itemNo?: string | null): string =>
  itemNo ? `/api/photos/cad/${encodeURIComponent(itemNo)}` : '';

/**
 * onError handler สำหรับ <img>: ครั้งแรกที่โหลด ps ไม่ได้ให้สลับไป cad,
 * ครั้งที่สอง (cad ก็ไม่มี) ให้ซ่อนรูปแล้วเรียก onMissing (ถ้ามี) เพื่อโชว์ placeholder
 */
export function attachPhotoFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  itemNo?: string | null,
  onMissing?: () => void,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallback !== 'cad' && itemNo) {
    img.dataset.fallback = 'cad';
    img.src = cadPhotoUrl(itemNo);
  } else {
    img.style.display = 'none';
    onMissing?.();
  }
}
