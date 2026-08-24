export function printChartDashboard(docTitle?: string): void {
  const originalTitle = document.title;
  if (docTitle) document.title = docTitle;

  // บังคับให้ Recharts วัดขนาดใหม่ก่อนพิมพ์
  window.dispatchEvent(new Event('resize'));

  // รอ 1 frame ให้ re-render เสร็จก่อนค่อยเปิด print dialog
  requestAnimationFrame(() => {
    window.print();
  });

  if (docTitle) {
    window.addEventListener('afterprint', () => {
      document.title = originalTitle;
    }, { once: true });
  }
}
