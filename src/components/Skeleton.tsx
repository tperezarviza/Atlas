interface SkeletonProps {
  lines?: number;
  type?: 'lines' | 'chart';
}

const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,200,50,.03) 25%, rgba(255,200,50,.06) 50%, rgba(255,200,50,.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
} as const;

export default function Skeleton({ lines = 4, type = 'lines' }: SkeletonProps) {
  if (type === 'chart') {
    return (
      <div className="px-3 py-3 flex items-end gap-[3px] h-[60px]">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="rounded-t-[1px] flex-1"
            style={{
              ...shimmerStyle,
              height: `${20 + Math.sin(i * 0.7) * 15 + 15}%`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 flex flex-col gap-[10px]">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex flex-col gap-[5px]">
          <div
            className="h-[10px] rounded-[2px]"
            style={{ ...shimmerStyle, width: `${50 + (i % 3) * 15}%` }}
          />
          <div
            className="h-[8px] rounded-[2px]"
            style={{ ...shimmerStyle, width: `${70 + (i % 2) * 20}%` }}
          />
        </div>
      ))}
    </div>
  );
}
