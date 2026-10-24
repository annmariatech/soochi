export default function PageHeader({
  eyebrow,
  title,
  description,
  illustration,
  illustrationAlt = "",
  className = "",
}) {
  const innerClassName = illustration
    ? "other-inner page-header-inner with-illustration"
    : "other-inner page-header-inner"

  return (
    <section className={["other-paper", "gingham", "page-header", className].filter(Boolean).join(" ")}>
      <div className={innerClassName}>
        <div className="page-header-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-lead">{description}</p>}
        </div>
        {illustration && (
          <img className="page-header-illustration" src={illustration} alt={illustrationAlt} />
        )}
      </div>
    </section>
  )
}
