import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Filter,
  Search,
  Award,
  X,
  Crown,
} from "lucide-react";
import {
  fetchCustomerSummary,
  fetchAvailableYears,
} from "../services/dashboardAPI";
import { getCustomerGroupId } from "../config/customerGroups";
import Topbar from "../components/layout/Topbar";

// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function TopOrdersGalleryPage() {
    const [searchParams] = useSearchParams();
  const metric = searchParams.get("metric") || "amount";

  const fmt = (val: number) => {
    if (metric === "qty")
      return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ── DATA STATE ──
  const [custData, setCustData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ── FILTER STATE ──
  const [baseYear, setBaseYear] = useState<string>("");
  const [selGroups, setSelGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // ── PREVIEW STATE ──
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        yearMenuRef.current &&
        !yearMenuRef.current.contains(e.target as Node)
      ) {
        setShowYearMenu(false);
      }
      if (
        groupMenuRef.current &&
        !groupMenuRef.current.contains(e.target as Node)
      ) {
        setShowGroupMenu(false);
      }
    };
    if (showYearMenu || showGroupMenu)
      document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showYearMenu, showGroupMenu]);

  // ── FETCH DATA ──
  useEffect(() => {
    setLoading(true);
    fetchAvailableYears()
      .then((yrs) => {
        const sortedYrs = yrs.map(String).sort((a, b) => Number(a) - Number(b));
        setAvailableYears(sortedYrs);
        if (sortedYrs.length > 0) {
          setBaseYear(sortedYrs[sortedYrs.length - 1]);
        }
        return fetchCustomerSummary(sortedYrs);
      })
      .then((cData) => setCustData(cData))
      .catch((err) => console.error("Error fetching report data:", err))
      .finally(() => setLoading(false));
  }, []);

  // Close preview on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        previewRef.current &&
        !previewRef.current.contains(e.target as Node)
      ) {
        setPreviewItem(null);
      }
    };
    if (previewItem) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [previewItem]);

  // ── TABLE DATA COMPUTATION ──
  const tableData = useMemo(() => {
    if (!baseYear) return { rows: [] };

    let rows: any[] = [];
    custData.forEach((cust) => {
      const gId = getCustomerGroupId(cust.id || "");
      if (selGroups.length > 0 && !selGroups.includes(gId)) return;

      const source = metric === "qty" ? cust.monthlyQty : cust.monthly;
      let yrTotal = 0;

      MONTHS.forEach((_m, idx) => {
        const val = source?.[baseYear]?.[String(idx + 1)] || 0;
        yrTotal += val;
      });

      if (yrTotal > 0 && cust.topItem) {
        rows.push({
          id: cust.id,
          label: cust.id,
          topItem: cust.topItem,
          topItemQty: cust.topItemQty,
          yrTotal: yrTotal,
        });
      }
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r: any) => r.label.toLowerCase().includes(q));
    }

    rows.sort((a, b) => b.yrTotal - a.yrTotal);

    return { rows };
  }, [custData, baseYear, selGroups, searchQuery, metric]);

  const toggleGroup = (gId: string) => {
    setSelGroups((prev) =>
      prev.includes(gId) ? prev.filter((g) => g !== gId) : [...prev, gId],
    );
  };

  // ── Rank Colors (Enterprise BI Style) ──
  const getRankStyle = (idx: number) => {
    if (idx === 0) return { bg: "var(--color-warning-500)", text: "#ffffff" };
    if (idx === 1) return { bg: "var(--color-text-secondary)", text: "#ffffff" };
    if (idx === 2) return { bg: "var(--color-warning-700)", text: "#ffffff" };
    return { bg: "var(--color-surface-2)", text: "var(--color-text-primary)" };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-1)]">
        <Topbar
          breadcrumb={[
            { label: "JEWELRY SMART FACTORY", path: "/" },
            { label: "Top Orders Gallery" },
          ]}
          icon={<Award size={22} />}
          hideSearch={true}
          rightContent={
            <div className="flex items-center gap-2 pr-2">
              {/* Local Search */}
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-tertiary)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: 10,
                    padding: "8px 16px 8px 34px",
                    fontSize: "0.85rem",
                    color: "var(--color-text-primary)",
                    outline: "none",
                    width: 200,
                    transition: "all 0.2s",
                    boxShadow:
                      "inset 0 1px 3px color-mix(in srgb, var(--color-surface-900) 6%, transparent)",
                  }}
                  className="focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      color: "var(--color-text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Custom Year Dropdown */}
              <div className="relative z-[100]" ref={yearMenuRef}>
                <button
                  onClick={() => setShowYearMenu(!showYearMenu)}
                  style={{
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    outline: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "var(--font-display)",
                    boxShadow:
                      "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                  className="hover:border-brand-300 hover:text-brand-600 hover:shadow-md"
                >
                  <span className="text-[var(--color-text-secondary)] font-medium text-[0.8rem] uppercase tracking-wider">
                    Year
                  </span>
                  {baseYear}
                  <div
                    style={{
                      transform: showYearMenu
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition:
                        "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                    className="text-[var(--color-text-tertiary)]"
                  >
                    <svg
                      width="12"
                      height="7"
                      viewBox="0 0 12 7"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 1L6 6L11 1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>

                {showYearMenu && (
                  <div className="absolute right-0 mt-2 w-36 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-2 shadow-xl z-[100] animate-fade-in-up">
                    {availableYears.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => {
                          setBaseYear(yr);
                          setShowYearMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors font-display font-bold ${baseYear === yr ? "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]"}`}
                      >
                        <span>{yr}</span>
                        {baseYear === yr && (
                          <div className="w-2 h-2 rounded-full bg-[var(--color-brand-500)] shadow-[0_0_8px_rgba(var(--color-brand-500),0.6)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Group Dropdown */}
              <div className="relative z-[100]" ref={groupMenuRef}>
                <button
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                  style={{
                    background:
                      selGroups.length > 0
                        ? "var(--color-brand-50)"
                        : "var(--color-surface-0)",
                    border: `1px solid ${selGroups.length > 0 ? "var(--color-brand-400)" : "var(--color-border-light)"}`,
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color:
                      selGroups.length > 0
                        ? "var(--color-brand-700)"
                        : "var(--color-text-primary)",
                    outline: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "var(--font-display)",
                    boxShadow:
                      "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                  className="hover:border-brand-300 hover:text-brand-600 hover:shadow-md"
                >
                  <Filter size={16} />
                  <span className="font-medium text-[0.8rem] uppercase tracking-wider">
                    Groups
                  </span>
                  {selGroups.length > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-brand-500)] text-white text-[10px] shadow-sm">
                      {selGroups.length}
                    </span>
                  )}
                </button>

                {showGroupMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-4 shadow-2xl z-[100] animate-fade-in-up">
                    <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border-light)] pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                        Filter by Group
                      </span>
                      {selGroups.length > 0 && (
                        <button
                          onClick={() => setSelGroups([])}
                          className="text-[10px] font-bold uppercase text-[var(--color-danger-500)] hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "BBC",
                        "BBQ",
                        "BBD",
                        "BBI",
                        "BBF",
                        "BBP",
                        "BBT",
                        "BBX",
                        "BBK",
                        "BBR",
                        "BBL",
                        "BBS",
                        "BBE",
                      ].map((gId) => {
                        const isActive = selGroups.includes(gId);
                        return (
                          <button
                            key={gId}
                            onClick={() => toggleGroup(gId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${isActive ? "bg-[var(--color-brand-500)] text-white shadow-md scale-105" : "bg-[var(--color-surface-0)] text-[var(--color-text-primary)] border border-[var(--color-border-light)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:-translate-y-0.5"}`}
                          >
                            {gId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* ── MAIN GALLERY GRID (Enterprise BI Layout) ── */}
        <div
          className="content-scrollbar"
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
            background: "var(--color-surface-1)",
          }}
        >
          <style>{`
          .gallery-card-hover .hover-overlay {
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s ease;
          }
          .gallery-card-hover:hover .hover-overlay {
            opacity: 1;
            transform: translateY(0);
          }
          .gallery-card-hover .hover-hint {
            opacity: 0;
            transition: all 0.2s ease;
          }
          .gallery-card-hover:hover .hover-hint {
            opacity: 1;
          }
          .gallery-img {
            transition: all 0.3s ease;
          }
          .gallery-card-hover:hover .gallery-img {
            transform: scale(1.02);
          }
        `}</style>
          {loading ? (
            /* ── SHIMMER SKELETON ── */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gridAutoRows: "260px",
                gridAutoFlow: "dense",
                gap: "20px",
                maxWidth: "2000px",
                margin: "0 auto",
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    gridColumn: i < 3 ? "span 2" : "span 1",
                    gridRow: i < 3 ? "span 2" : "span 1",
                    background: "var(--color-surface-0)",
                    borderRadius: 24,
                    overflow: "hidden",
                    border: "1px solid var(--color-border-light)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background:
                        "linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-1) 50%, var(--color-surface-2) 75%)",
                      backgroundSize: "200% 100%",
                      animation: "skeletonShimmer 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : tableData.rows.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "100px 0",
                color: "var(--color-text-tertiary)",
                gap: 12,
              }}
            >
              <Search size={40} style={{ opacity: 0.25 }} />
              <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                No items match your filter.
              </span>
              <span
                style={{ fontSize: "0.85rem", fontWeight: 500, opacity: 0.7 }}
              >
                Try adjusting your search or group filters.
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gridAutoRows: "280px",
                gridAutoFlow: "dense",
                gap: "32px",
                maxWidth: "2400px",
                margin: "0 auto",
                direction: "ltr",
              }}
            >
              {tableData.rows.map((row, idx) => {
                

                // Enterprise Dashboard Size Logic
                let colSpan = 1;
                let rowSpan = 1;
                if (idx === 0) {
                  colSpan = 3;
                  rowSpan = 2;
                } // Rank 1: Massive
                else if (idx === 1) {
                  colSpan = 2;
                  rowSpan = 2;
                } // Rank 2: Medium
                else if (idx === 2) {
                  colSpan = 1;
                  rowSpan = 2;
                } // Rank 3: Tall
                else if (idx === 3 || idx === 4) {
                  colSpan = 2;
                  rowSpan = 1;
                }

                const rankStyle = getRankStyle(idx);

                return (
                  <div
                    key={`gallery_${row.id}`}
                    className="gallery-card-hover group"
                    onClick={() =>
                      setPreviewItem({
                        id: row.topItem,
                        rank: idx + 1,
                        cust: row.label,
                        total: row.yrTotal,
                        qty: row.topItemQty,
                      })
                    }
                    style={{
                      gridColumn: `span ${colSpan}`,
                      gridRow: `span ${rowSpan}`,
                      background: "var(--color-surface-0)",
                      borderRadius: 8 /* Enterprise Clean Geometry */,
                      overflow: "hidden",
                      position: "relative",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                      border: "1px solid var(--color-border-light)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.2s ease",
                      animation: `fadeInUp 0.3s ease ${Math.min(idx * 30, 300)}ms both`,
                      direction: "ltr",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)";
                      e.currentTarget.style.borderColor =
                        "var(--color-brand-300)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)";
                      e.currentTarget.style.borderColor =
                        "var(--color-border-light)";
                    }}
                  >
                    {/* ── Corporate Rank Badge ── */}
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        zIndex: 10,
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: rankStyle.bg,
                        color: rankStyle.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-display)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* ── Enterprise Image Container (White Canvas Frame) ── */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "#ffffff" /* Always pure white to frame the product photos */,
                        borderBottom: "1px solid var(--color-border-light)",
                        position: "relative",
                        minHeight: 0,
                      }}
                    >
                      <img
                        src={`/api/photos/ps/${row.topItem}`}
                        alt={row.topItem}
                        className="gallery-img"
                        style={{
                          maxWidth: "80%",
                          maxHeight: "80%",
                          objectFit: "contain",
                        }}
                        onError={(e: any) => {
                          if (!e.target.dataset.triedCad) {
                            e.target.dataset.triedCad = "true";
                            e.target.src = `/api/photos/cad/${row.topItem}`;
                          } else {
                            e.target.style.display = "none";
                          }
                        }}
                      />
                      {/* ── Hover Info Overlay ── */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
                        style={{
                          background:
                            "color-mix(in srgb, var(--color-surface-900) 80%, transparent)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center gap-2 text-center">
                          <span
                            style={{
                              fontSize: "1.2rem",
                              color: "rgba(255,255,255,0.7)",
                              fontWeight: 600,
                            }}
                          >
                            Ordered Qty
                          </span>
                          <span
                            style={{
                              fontSize: "2rem",
                              color: "#fff",
                              fontWeight: 900,
                              fontFamily: "var(--font-display)",
                              lineHeight: 1,
                            }}
                          >
                            {(row.topItemQty || 0).toLocaleString()}{" "}
                            <span
                              style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.5)",
                              }}
                            >
                              pcs
                            </span>
                          </span>
                          <div
                            style={{
                              width: 40,
                              height: 2,
                              background: "var(--color-brand-500)",
                              margin: "8px 0",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.9rem",
                              color: "rgba(255,255,255,0.7)",
                              fontWeight: 600,
                            }}
                          >
                            Total Value
                          </span>
                          <span
                            style={{
                              fontSize: "1.5rem",
                              color: "var(--color-brand-400)",
                              fontWeight: 800,
                            }}
                          >
                            {fmt(row.yrTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Static Bottom Bar ── */}
                    <div
                      style={{
                        padding: idx === 0 ? "20px 24px" : "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--color-surface-0)",
                        zIndex: 10,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          fontSize: idx === 0 ? "1.4rem" : "1.1rem",
                          fontWeight: 900,
                          color: "var(--color-text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        <Award
                          size={idx === 0 ? 24 : 18}
                          style={{ color: rankStyle.bg }}
                        />
                        {row.label}
                      </span>
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-brand-600)",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Click to View
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PHOTO PREVIEW MODAL (Luxurious Lightbox) ── */}
        {previewItem && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background:
                "color-mix(in srgb, var(--color-surface-900) 85%, transparent)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              ref={previewRef}
              style={{
                background: "var(--color-surface-0)",
                borderRadius: 32,
                border:
                  "1px solid color-mix(in srgb, var(--color-border-light) 50%, transparent)",
                boxShadow:
                  "0 32px 100px color-mix(in srgb, var(--color-surface-900) 60%, transparent), inset 0 2px 4px rgba(255,255,255,0.1)",
                width: "98vw",
                maxWidth: 1800,
                height: "98vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Modal Title Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 32px",
                  borderBottom: "1px solid var(--color-border-light)",
                  background:
                    "color-mix(in srgb, var(--color-surface-1) 80%, transparent)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {previewItem.rank <= 3 && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Crown
                        size={32}
                        style={{
                          color:
                            previewItem.rank === 1
                              ? "#FFD700"
                              : previewItem.rank === 2
                                ? "#C0C0C0"
                                : "#CD7F32",
                          filter: `drop-shadow(0 0 12px ${previewItem.rank === 1 ? "rgba(255,215,0,0.6)" : previewItem.rank === 2 ? "rgba(192,192,192,0.6)" : "rgba(205,127,50,0.6)"})`,
                          animation: "pulse 2s infinite",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            color: "var(--color-text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          TOP {previewItem.rank} Order
                        </span>
                        <span
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: 900,
                            color: "var(--color-text-primary)",
                            fontFamily: "var(--font-display)",
                            lineHeight: 1,
                          }}
                        >
                          {previewItem.cust}
                        </span>
                      </div>
                    </div>
                  )}
                  {previewItem.rank > 3 && (
                    <span
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {previewItem.id}
                    </span>
                  )}
                  {previewItem.rank <= 3 && (
                    <span
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        color: "var(--color-text-tertiary)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      • {previewItem.id}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--color-brand-600)",
                        background:
                          "color-mix(in srgb, var(--color-brand-500) 15%, transparent)",
                        padding: "4px 12px",
                        borderRadius: 20,
                        border:
                          "1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)",
                      }}
                    >
                      Item Gallery
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: 50,
                    cursor: "pointer",
                    padding: 8,
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                    boxShadow:
                      "0 2px 8px color-mix(in srgb, var(--color-surface-900) 10%, transparent)",
                  }}
                  className="hover:bg-danger-50 hover:text-danger-600 hover:border-danger-300 hover:scale-110"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Images Split View */}
              <div
                className="content-scrollbar"
                style={{
                  display: "flex",
                  flex: 1,
                  overflowY: "auto",
                  background: "#ffffff",
                  flexWrap: "wrap",
                  alignContent: "flex-start",
                }}
              >
                {/* Product Shot Pane */}
                <div
                  style={{
                    flex: "1 1 500px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "24px 32px 0 32px",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 4,
                        background: "var(--color-brand-500)",
                        borderRadius: 2,
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      Product Shot
                    </h3>
                  </div>

                  {/* Lightbox Canvas */}
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 0,
                      maxHeight: "calc(90vh - 150px)",
                    }}
                  >
                    <img
                      src={`/api/photos/ps/${previewItem.id}`}
                      alt={`${previewItem.id} Product Shot`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e: any) => {
                        const container = e.target.parentElement.parentElement;
                        if (container) container.style.display = "none";
                      }}
                    />
                  </div>
                </div>

                {/* CAD Design Pane */}
                <div
                  style={{
                    flex: "1 1 500px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "24px 32px 0 32px",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 4,
                        background: "var(--color-text-tertiary)",
                        borderRadius: 2,
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      Computer-Aided Design
                    </h3>
                  </div>

                  {/* Lightbox Canvas */}
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 0,
                      maxHeight: "calc(90vh - 150px)",
                    }}
                  >
                    <img
                      src={`/api/photos/cad/${previewItem.id}`}
                      alt={`${previewItem.id} CAD`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e: any) => {
                        const container = e.target.parentElement.parentElement;
                        if (container) container.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
