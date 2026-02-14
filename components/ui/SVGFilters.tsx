export function SVGFilters() {
  return (
    <svg className="hidden fixed">
      <defs>
        <filter id="wet-paint">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.005" numOctaves="5" result="warp" />
          <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="30" in="SourceGraphic" in2="warp" />
        </filter>
        <filter id="rough-edge">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
        </filter>
      </defs>
    </svg>
  )
}
