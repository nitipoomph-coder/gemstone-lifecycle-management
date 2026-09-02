export function TopOrdersSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <style>{`
        @keyframes shimmer { 
          0% { background-position: 200% 0; } 
          100% { background-position: -200% 0; } 
        }
        .gallery-sk-cell {
          background: linear-gradient(110deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%);
          background-size: 400% 100%;
          animation: shimmer 1.5s linear infinite;
          border-radius: 4px;
        }
      `}</style>

      {/* 1. Summary Header Skeleton (เลียนแบบแถบด้านบน) */}
      <div
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          borderBottom: "1px solid var(--color-border-light)",
          background: "var(--color-surface-0)",
          marginBottom: "20px" // เพิ่มระยะห่างก่อนเริ่ม Grid
        }}
      >
        {/* ซ้าย: ชื่อหัวข้อและรายละเอียด */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="gallery-sk-cell" style={{ height: "24px", width: "130px", borderRadius: "6px" }} />
            <div className="gallery-sk-cell" style={{ height: "24px", width: "180px", borderRadius: "6px" }} />
          </div>
          <div className="gallery-sk-cell" style={{ height: "14px", width: "320px" }} />
        </div>

        {/* ขวา: กล่อง KPI (Volume & Value) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {[1, 2].map((key) => (
            <div
              key={key}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--color-surface-1)",
                border: "1px solid var(--color-border-light)",
                minWidth: 190,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div className="gallery-sk-cell" style={{ height: "12px", width: "50%" }} />
              <div className="gallery-sk-cell" style={{ height: "28px", width: "70%", borderRadius: "6px" }} />
              <div className="gallery-sk-cell" style={{ height: "10px", width: "90%" }} />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Gallery Grid Skeleton (ส่วนการ์ดสินค้า) */}
      <div className="gallery-grid" style={{ padding: "0 20px" }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="gallery-loading-card"
            style={{
              background: "var(--color-surface-0)",
              borderRadius: 12,
              padding: "16px",
              border: "1px solid var(--color-border-light)",
              display: "flex",
              flexDirection: "column",
              minHeight: "280px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {/* Header Row */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div className="gallery-sk-cell" style={{ height: "12px", width: "40%" }} />
              <div className="gallery-sk-cell" style={{ height: "12px", width: "15%" }} />
            </div>

            {/* Image Area & Dimensions */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingBottom: "16px"
            }}>
              <div
                className="gallery-sk-cell"
                style={{ margin: "auto", width: "50%", height: "40px", borderRadius: "20px", opacity: 0.6 }}
              />
              <div className="gallery-sk-cell" style={{ height: "10px", width: "25%", marginTop: "auto" }} />
            </div>

            {/* Footer Row 1 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
              <div className="gallery-sk-cell" style={{ height: "16px", width: "35%", borderRadius: "6px" }} />
              <div className="gallery-sk-cell" style={{ height: "16px", width: "30%", borderRadius: "6px" }} />
            </div>

            {/* Footer Row 2 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="gallery-sk-cell" style={{ height: "12px", width: "25%" }} />
              <div className="gallery-sk-cell" style={{ height: "12px", width: "45%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}