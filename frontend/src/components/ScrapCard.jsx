export default function ScrapCard({
  scrap,
  selectable = false,
  selected = false,
  onToggle,
  extra,
}) {
  return (
    <article className={`scrap-card ${selected ? "is-selected" : ""}`}>
      <div className="scrap-photo">
        <img
          src={scrap.image || scrap.crop_url}
          alt={`${scrap.type || scrap.tags?.fabric_type} fabric in ${scrap.colorName || scrap.color_name}`}
        />
        <span className="photo-label">
          FABRIC NO. {String(scrap.id).padStart(2, "0")}
        </span>
        {selectable ? (
          <button
            className={`heart-button ${selected ? "is-loved" : ""}`}
            aria-pressed={selected}
            aria-label={`${selected ? "Deselect" : "Select"} ${scrap.name}`}
            onClick={() => onToggle?.(scrap.id)}
          >
            {selected ? "✓" : "+"}
          </button>
        ) : (
          <button
            className="heart-button"
            aria-label={`Save ${scrap.name} as a favourite`}
            onClick={(event) => {
              event.currentTarget.classList.toggle("is-loved")
            }}
          >
            ♡
          </button>
        )}
      </div>

      <div className="scrap-info">
        <div className="scrap-title-row">
          <h3>{scrap.name}</h3>
          <span
            className="color-dot"
            style={{ backgroundColor: scrap.color || scrap.color_hex }}
            title={scrap.colorName || scrap.color_name}
          />
        </div>

        <p className="fabric-type">
          {scrap.type || scrap.tags?.fabric_type} · {scrap.pattern || scrap.tags?.pattern}
        </p>

        <div className="measurement">
          <span>↔ {scrap.width ?? scrap.width_cm} cm</span>
          <span>↕ {scrap.height ?? scrap.height_cm} cm</span>
        </div>

        <div className="tag-row">
          <span className="tag">{scrap.weight || scrap.tags?.weight}</span>
          <span className="tag">{scrap.colorName || scrap.color_name}</span>
          {scrap.stretch || scrap.tags?.stretch ? (
            <span className="tag">{scrap.stretch || scrap.tags?.stretch} stretch</span>
          ) : null}
        </div>
        {extra}
      </div>
    </article>
  )
}
