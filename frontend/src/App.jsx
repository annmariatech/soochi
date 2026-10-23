import { useEffect, useState } from "react";
import {
  analyzeScraps,
  saveScraps,
  getMyScraps,
  getProducts,
  matchScrapsToProducts,
  matchProductToScraps,
  createRequest,
  getIncomingRequests,
  getOutgoingRequests,
  respondToRequest,
} from "./api";
import "./App.css";

const scraps = [
  {
    id: 1,
    name: "Rosie",
    type: "Cotton",
    width: 45,
    height: 60,
    color: "#D9879A",
    colorName: "Dusty rose",
    pattern: "Solid",
    weight: "Light",
    image: "https://placehold.co/500x400/E9BCC7/754653?text=Pink+Cotton",
  },
  {
    id: 2,
    name: "Olive",
    type: "Linen",
    width: 35,
    height: 50,
    color: "#83946A",
    colorName: "Sage green",
    pattern: "Solid",
    weight: "Medium",
    image: "https://placehold.co/500x400/D9DFC9/4D6040?text=Sage+Linen",
  },
  {
    id: 3,
    name: "Sunny",
    type: "Rayon",
    width: 55,
    height: 40,
    color: "#E0B66F",
    colorName: "Mustard",
    pattern: "Floral",
    weight: "Light",
    image: "https://placehold.co/500x400/F0DDB4/80612C?text=Floral+Rayon",
  },
  {
    id: 4,
    name: "Cloudy",
    type: "Cotton",
    width: 30,
    height: 35,
    color: "#9CBBC9",
    colorName: "Powder blue",
    pattern: "Checked",
    weight: "Light",
    image: "https://placehold.co/500x400/D4E5EA/426776?text=Blue+Cotton",
  },
];

const navigation = [
  { id: "inventory", icon: "▧", label: "My scraps" },
  { id: "match", icon: "✂", label: "Make things" },
  { id: "nearby", icon: "⌖", label: "Near me" },
  { id: "requests", icon: "♡", label: "Requests" },
];

function ScrapCard({ scrap }) {
  return (
    <article className="scrap-card">
      <div className="scrap-photo">
        <img
          src={scrap.image}
          alt={`${scrap.type} fabric in ${scrap.colorName}`}
        />
        <span className="photo-label">
          FABRIC NO. {String(scrap.id).padStart(2, "0")}
        </span>
        <button
          className="heart-button"
          aria-label={`Save ${scrap.name} as a favourite`}
          onClick={(event) => {
            event.currentTarget.classList.toggle("is-loved");
          }}
        >
          ♡
        </button>
      </div>

      <div className="scrap-info">
        <div className="scrap-title-row">
          <h3>{scrap.name}</h3>
          <span
            className="color-dot"
            style={{ backgroundColor: scrap.color }}
            title={scrap.colorName}
          />
        </div>

        <p className="fabric-type">
          {scrap.type} · {scrap.pattern}
        </p>

        <div className="measurement">
          <span>↔ {scrap.width} cm</span>
          <span>↕ {scrap.height} cm</span>
        </div>

        <div className="tag-row">
          <span className="tag">{scrap.weight}</span>
          <span className="tag">{scrap.colorName}</span>
        </div>
      </div>
    </article>
  );
}

function Inventory({ onNavigate, extraScraps = [] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredScraps = scraps.filter((scrap) => {
    const matchesSearch = `${scrap.name} ${scrap.type} ${scrap.colorName}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter = filter === "All" || scrap.type === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <section className="hero-panel gingham">
        <div className="hero-paper">
          <span className="eyebrow">
            A LITTLE LESS WASTE, A LOT MORE WONDER
          </span>
          <h1>
            Your scraps,
            <br />
            their <span>second life.</span>
          </h1>
          <p>
            Tiny pieces, big possibilities. Let's turn your leftover fabric into
            something lovely.
          </p>
          <button
            className="primary-button"
            onClick={() => onNavigate("match")}
          >
            Find something to make <span>↗</span>
          </button>
          <span className="hero-doodle" aria-hidden="true">
            ✿
          </span>
          <span className="hero-sticker" aria-hidden="true">
            made
            <br />
            with ♡
          </span>
        </div>
      </section>

      <main className="inventory-main">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">YOUR LITTLE FABRIC LIBRARY</p>
            <h2>
              The scrap basket <span>♡</span>
            </h2>
          </div>
          <div className="scrap-count">
            <strong>{filteredScraps.length.toString().padStart(2, "0")}</strong>
            <span>pieces</span>
          </div>
        </div>

        <div className="inventory-toolbar">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a fabric..."
              aria-label="Search fabrics"
            />
          </label>

          <button className="add-button" onClick={() => onNavigate("add")}>
            <span>＋</span> Add scrap
          </button>
        </div>

        <div className="filter-row" aria-label="Filter fabrics">
          {["All", "Cotton", "Linen", "Rayon"].map((type) => (
            <button
              key={type}
              className={`filter-chip ${filter === type ? "active" : ""}`}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="collection-note">
          <span className="note-flower" aria-hidden="true">
            ✿
          </span>
          <p>
            <strong>Every little piece counts.</strong>
            <br />
            You might be one scrap away from your next favourite thing.
          </p>
        </div>

        <div className="scrap-grid">
          {filteredScraps.map((scrap) => (
            <ScrapCard key={scrap.id} scrap={scrap} />
          ))}
        </div>

        {filteredScraps.length === 0 && (
          <div className="empty-state">
            <span>🧵</span>
            <h3>No scraps found just yet</h3>
            <p>Try another search or fabric type.</p>
          </div>
        )}

        <section className="bottom-promo gingham">
          <div className="promo-inner">
            <span className="eyebrow">A SMALL IDEA FOR TODAY</span>
            <h2>
              Little scraps.
              <br />
              Lovely creations.
            </h2>
            <p>Ready to see what your fabric can become?</p>
            <button
              className="primary-button"
              onClick={() => onNavigate("match")}
            >
              Let's make something <span>♡</span>
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function OtherPage({ page, onNavigate }) {
  const content = {
    match: {
      eyebrow: "YOUR NEXT LITTLE PROJECT",
      title: "What shall we make?",
      description:
        "Choose your fabric scraps and discover what you can create with them.",
      icon: "✂",
      action: "Browse my scraps",
      target: "inventory",
    },
    nearby: {
      eyebrow: "MAKERS HELPING MAKERS",
      title: "Good things are nearby.",
      description:
        "Discover fabric scraps from other makers in your area and give them a second life.",
      icon: "⌖",
      action: "Back to my basket",
      target: "inventory",
    },
    requests: {
      eyebrow: "A LITTLE NOTE FROM A MAKER",
      title: "Sharing is caring.",
      description:
        "Your fabric requests and sharing approvals will find a home here.",
      icon: "♡",
      action: "Explore my scraps",
      target: "inventory",
    },
  };

  const item = content[page];

  return (
    <main className="other-page">
      <section className="other-paper gingham">
        <div className="other-inner">
          <span className="eyebrow">{item.eyebrow}</span>
          <div className="other-icon">{item.icon}</div>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
          <button
            className="primary-button"
            onClick={() => onNavigate(item.target)}
          >
            {item.action} <span>↗</span>
          </button>
        </div>
      </section>
      <p className="coming-soon">
        A little more stitching to do here. Coming together soon!
      </p>
    </main>
  );
}

function AddScrapPage({ onNavigate, onSaved }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scraps, setScraps] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleAnalyze() {
    if (!photo) {
      setError("Please take or upload a fabric photo first.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setScraps([]);

    try {
      const { analyzeScraps } = await import("./api");
      const result = await analyzeScraps(photo);
      const detected = result.scraps || result.detected_scraps || [];

      if (!detected.length) {
        setError(
          result.marker_found === false
            ? "Reference marker not found. Place a ruler or reference marker beside the fabric and try again."
            : "No scraps were detected. Try another photo with the reference marker clearly visible.",
        );
        return;
      }

      setScraps(
        detected.map((scrap, index) => ({
          ...scrap,
          temp_id: scrap.temp_id ?? `scrap-${index}`,
          width_cm: scrap.width_cm ?? 0,
          height_cm: scrap.height_cm ?? 0,
          fabric_type: scrap.tags?.fabric_type ?? scrap.fabric_type ?? "Cotton",
          stretch: scrap.tags?.stretch ?? scrap.stretch ?? "None",
          weight: scrap.tags?.weight ?? scrap.weight ?? "Medium",
          pattern: scrap.tags?.pattern ?? scrap.pattern ?? "Solid",
          color_hex: scrap.color_hex ?? "#D9879A",
        })),
      );

      setNotice(
        `Found ${detected.length} scrap${detected.length === 1 ? "" : "s"}! Review the details below.`,
      );
    } catch (err) {
      setError(
        err.message || "Could not analyze this photo. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateScrap(index, field, value) {
    setScraps((current) =>
      current.map((scrap, i) =>
        i === index ? { ...scrap, [field]: value } : scrap,
      ),
    );
  }

  async function handleSave() {
    if (!scraps.length) {
      setError("Analyze a photo before saving scraps.");
      return;
    }

    if (
      scraps.some(
        (scrap) => Number(scrap.width_cm) <= 0 || Number(scrap.height_cm) <= 0,
      )
    ) {
      setError("Enter a width and height greater than zero for every scrap.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { saveScraps } = await import("./api");
      const payload = scraps.map(({ temp_id, ...scrap }) => ({
        ...scrap,
        width_cm: Number(scrap.width_cm),
        height_cm: Number(scrap.height_cm),
      }));

      const result = await saveScraps(payload);
      const saved = Array.isArray(result)
        ? result
        : result.scraps || result.items || payload;

      onSaved(saved);
    } catch (err) {
      setError(err.message || "Could not save your scraps.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="add-scrap-content">
      <button className="back-button" onClick={() => onNavigate("inventory")}>
        ← Back to inventory
      </button>

      <h1>Add fabric scraps</h1>
      <p>Give leftover fabric a second life, one little piece at a time.</p>

      <section className="add-step-card">
        <h2>1. Photograph your fabric</h2>
        <p>
          Place each scrap on a flat surface. Keep a ruler or reference marker
          clearly visible beside it so we can estimate its dimensions.
        </p>

        <label className="photo-picker">
          <span>
            {photo ? "Choose another photo" : "Take a photo or upload an image"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPhoto(file);
              setPreview(URL.createObjectURL(file));
              setScraps([]);
              setError("");
              setNotice("");
            }}
          />
        </label>

        {preview && (
          <img className="uploaded-photo" src={preview} alt="Selected fabric" />
        )}

        <button
          className="scan-button"
          onClick={handleAnalyze}
          disabled={!photo || loading}
        >
          {loading ? "Scanning fabric…" : "Scan for scraps ✨"}
        </button>
      </section>

      {error && <p className="error-note">{error}</p>}
      {notice && <p className="success-note">{notice}</p>}

      {scraps.length > 0 && (
        <section className="add-step-card">
          <h2>2. Review detected scraps</h2>
          <p>Check the measurements and edit any details before saving.</p>

          <div className="detected-grid">
            {scraps.map((scrap, index) => (
              <article className="detected-card" key={scrap.temp_id}>
                {scrap.crop_url && (
                  <img
                    src={scrap.crop_url}
                    alt={`Detected scrap ${index + 1}`}
                  />
                )}

                <h3>Scrap {index + 1}</h3>

                <div className="field-pair">
                  <label>
                    Width (cm)
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={scrap.width_cm}
                      onChange={(event) =>
                        updateScrap(index, "width_cm", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Height (cm)
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={scrap.height_cm}
                      onChange={(event) =>
                        updateScrap(index, "height_cm", event.target.value)
                      }
                    />
                  </label>
                </div>

                <label>
                  Fabric type
                  <select
                    value={scrap.fabric_type}
                    onChange={(event) =>
                      updateScrap(index, "fabric_type", event.target.value)
                    }
                  >
                    {[
                      "Cotton",
                      "Linen",
                      "Silk",
                      "Denim",
                      "Rayon",
                      "Polyester",
                      "Wool",
                      "Other",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Stretch
                  <select
                    value={scrap.stretch}
                    onChange={(event) =>
                      updateScrap(index, "stretch", event.target.value)
                    }
                  >
                    {["None", "Low", "Medium", "High", "Unknown"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  Weight
                  <select
                    value={scrap.weight}
                    onChange={(event) =>
                      updateScrap(index, "weight", event.target.value)
                    }
                  >
                    {["Light", "Medium", "Heavy", "Unknown"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Pattern
                  <select
                    value={scrap.pattern}
                    onChange={(event) =>
                      updateScrap(index, "pattern", event.target.value)
                    }
                  >
                    {[
                      "Solid",
                      "Floral",
                      "Striped",
                      "Checked",
                      "Printed",
                      "Other",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Colour
                  <input
                    type="color"
                    value={scrap.color_hex}
                    onChange={(event) =>
                      updateScrap(index, "color_hex", event.target.value)
                    }
                  />
                </label>
              </article>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving scraps…" : "Save scraps"}
          </button>
        </section>
      )}
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState("inventory");
  const [extraScraps, setExtraScraps] = useState([]);

  function handleSaved(saved) {
    const normalized = saved.map((scrap, index) => ({
      ...scrap,
      id: scrap.id ?? `saved-${Date.now()}-${index}`,
      name: scrap.name ?? scrap.fabric_type ?? "New scrap",
      type: scrap.fabric_type ?? scrap.tags?.fabric_type ?? "Other",
      width: scrap.width_cm ?? scrap.width ?? 0,
      height: scrap.height_cm ?? scrap.height ?? 0,
      color: scrap.color_hex ?? scrap.color ?? "#D9879A",
      colorName: scrap.tags?.dominant_color ?? "New colour",
      pattern: scrap.pattern ?? scrap.tags?.pattern ?? "Solid",
      weight: scrap.weight ?? scrap.tags?.weight ?? "Unknown",
      image:
        scrap.crop_url ??
        scrap.image ??
        "https://placehold.co/500x400/F5E4DE/754653?text=New+Scrap",
    }));

    setExtraScraps((current) => [...current, ...normalized]);
    setPage("inventory");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => setPage("inventory")}
          aria-label="Soochi home"
        >
          <span className="brand-mark">s.</span>
          <span>
            Soochi<span className="brand-dot">✳</span>
          </span>
        </button>

        <span className="header-note">
          made of little things <span>♡</span>
        </span>
      </header>

      {page === "inventory" ? (
        <Inventory onNavigate={setPage} extraScraps={extraScraps} />
      ) : page === "add" ? (
        <AddScrapPage onNavigate={setPage} onSaved={handleSaved} />
      ) : (
        <OtherPage page={page} onNavigate={setPage} />
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`nav-item ${page === item.id ? "selected" : ""}`}
            aria-current={page === item.id ? "page" : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
