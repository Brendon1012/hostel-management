export default function Brand({ light = false, compact = false }) {
  return (
    <span className={`brand ${light ? 'brand-light' : ''} ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <span>J</span><span>M</span><span>R</span>
      </span>
      {!compact && <span className="brand-copy"><strong>Jerry Manuel</strong><small>RESIDENCE</small></span>}
    </span>
  )
}
