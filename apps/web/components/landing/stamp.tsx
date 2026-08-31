type StampColor = "brass" | "teal" | "rust"

const INK: Record<StampColor, string> = {
  brass: "#c98a3a",
  teal: "#3d8a7f",
  rust: "#a8432c",
}

type StampProps = {
  id: string
  label: string
  ringText: string
  color: StampColor
  rotate?: number
  size?: number
  className?: string
}

export function Stamp({ id, label, ringText, color, rotate = -6, size = 108, className }: StampProps) {
  const ink = INK[color]
  const pathId = `stamp-ring-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
      className={className}
      style={{
        transform: `rotate(${rotate}deg)`,
        filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.15))",
        overflow: "visible",
      }}
    >
      <defs>
        <path id={pathId} d="M 60,60 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke={ink} strokeWidth="2.5" opacity="0.85" />
      <circle cx="60" cy="60" r="45" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.55" />
      <text fill={ink} fontSize="8" fontWeight="700" letterSpacing="2.6" fontFamily="var(--font-mono, monospace)">
        <textPath href={`#${pathId}`} startOffset="1%">
          {ringText}
        </textPath>
      </text>
      <text
        x="60"
        y="67"
        textAnchor="middle"
        fill={ink}
        fontSize="18"
        fontWeight="800"
        fontFamily="var(--font-stencil, sans-serif)"
        letterSpacing="0.5"
      >
        {label}
      </text>
    </svg>
  )
}
