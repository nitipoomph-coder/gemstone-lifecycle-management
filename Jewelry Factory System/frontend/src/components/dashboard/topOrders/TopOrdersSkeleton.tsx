export function TopOrdersSkeleton() {
  return (
    <div className="gallery-loading-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={i < 3 ? "gallery-loading-card gallery-loading-card--featured" : "gallery-loading-card"}
          style={{
            background: "var(--color-surface-0)",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid var(--color-border-light)",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-1) 50%, var(--color-surface-2) 75%)",
              backgroundSize: "200% 100%",
              animation: "skeletonShimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>
      ))}
    </div>
  );
}
