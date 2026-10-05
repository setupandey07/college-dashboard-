import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MetricValueSkeletonProps {
  isLoading: boolean;
  error?: string | null;
  value: React.ReactNode;
  unit?: string;
  className?: string;
  skeletonWidth?: string;
  skeletonHeight?: string;
}

/**
 * High-performance, anti-flicker metric value renderer.
 * Prevents premature '0' values by displaying an elegant pulse skeleton while loading,
 * an error badge if the query fails, and the genuine database value once resolved.
 */
export const MetricValueSkeleton: React.FC<MetricValueSkeletonProps> = ({
  isLoading,
  error,
  value,
  unit = '',
  className = 'text-2xl sm:text-3xl font-black text-[#14382C] leading-none mt-1',
  skeletonWidth = 'w-14 sm:w-16',
  skeletonHeight = 'h-7 sm:h-8'
}) => {
  if (isLoading) {
    return (
      <div
        className={`${skeletonHeight} ${skeletonWidth} bg-gradient-to-r from-[#E2ECE6] via-[#EDF6F1] to-[#E2ECE6] bg-[length:200%_100%] animate-pulse rounded-md mt-1`}
        aria-label="Loading statistic..."
      />
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-1 text-xs font-semibold text-rose-600 mt-1 py-1"
        title={`Error: ${error}`}
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Failed to load</span>
      </div>
    );
  }

  return (
    <p className={className}>
      {value}
      {unit}
    </p>
  );
};

interface TableRowsSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableRowsSkeleton: React.FC<TableRowsSkeletonProps> = ({
  rows = 4,
  cols = 5
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`sk-row-${rIdx}`} className="border-b border-[#EAF0EC] animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={`sk-col-${cIdx}`} className="py-3 px-4">
              <div
                className={`h-4 bg-[#E4EEE8] rounded-md ${
                  cIdx === 0 ? 'w-28' : cIdx === cols - 1 ? 'w-16' : 'w-12'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

interface CircularGaugeSkeletonProps {
  size?: number;
}

export const CircularGaugeSkeleton: React.FC<CircularGaugeSkeletonProps> = ({
  size = 48
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border-4 border-[#E2ECE6] border-t-[#B5D5C5] animate-spin"
      aria-label="Loading gauge..."
    />
  );
};
