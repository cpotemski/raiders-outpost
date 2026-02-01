import type { SVGProps } from "react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

type ProgressRingProps = SVGProps<SVGSVGElement> & {
  radius: number;
  stroke: number;
  progress: number;
  size?: number;
  trackColor?: string;
  progressColor?: string;
};

export function ProgressRing({
  radius,
  stroke,
  progress,
  size,
  trackColor = "rgba(160, 180, 190, 0.35)",
  progressColor = "rgba(72, 199, 214, 0.75)",
  ...props
}: ProgressRingProps) {
  const resolvedSize = size ?? radius * 2 + stroke * 2;
  const center = resolvedSize / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = clamp(progress) * circumference;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${resolvedSize} ${resolvedSize}`}
      {...props}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={stroke}
        strokeLinecap="square"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}
