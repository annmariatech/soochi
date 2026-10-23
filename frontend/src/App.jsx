
import { useState } from 'react'
import './App.css'

const scraps = [
  {
    id: 1,
    name: 'Rosie',
    type: 'Cotton',
    width: 45,
    height: 60,
    color: '#D9879A',
    colorName: 'Dusty rose',
    pattern: 'Solid',
    weight: 'Light',
    image: 'https://placehold.co/500x400/E9BCC7/754653?text=Pink+Cotton',
  },
  {
    id: 2,
    name: 'Olive',
    type: 'Linen',
    width: 35,
    height: 50,
    color: '#83946A',
    colorName: 'Sage green',
    pattern: 'Solid',
    weight: 'Medium',
    image: 'https://placehold.co/500x400/D9DFC9/4D6040?text=Sage+Linen',
  },
  {
    id: 3,
    name: 'Sunny',
    type: 'Rayon',
    width: 55,
    height: 40,
    color: '#E0B66F',
    colorName: 'Mustard',
    pattern: 'Floral',
    weight: 'Light',
    image: 'https://placehold.co/500x400/F0DDB4/80612C?text=Floral+Rayon',
  },
  {
    id: 4,
    name: 'Cloudy',
    type: 'Cotton',
    width: 30,
    height: 35,
    color: '#9CBBC9',
    colorName: 'Powder blue',
    pattern: 'Checked',
    weight: 'Light',
    image: 'https://placehold.co/500x400/D4E5EA/426776?text=Blue+Cotton',
  },
]

const navigation = [
  { id: 'inventory', icon: '▧', label: 'My scraps' },
  { id: 'match', icon: '✂', label: 'Make things' },
  { id: 'nearby', icon: '⌖', label: 'Near me' },
  { id: 'requests', icon: '♡', label: 'Requests' },
]

function ScrapCard({ scrap }) {
  return (
    <article className="scrap-card">
      <div className="scrap-photo">
        <img src={scrap.image} alt={`${scrap.type} fabric in ${scrap.colorName}`} />
        <span className="photo-label">FABRIC NO. {String(scrap.id).padStart(2, '0')}</span>
        <button
          className="heart-button"
          aria-label={`Save ${scrap.name} as a favourite`}
          onClick={(event) => {
            event.currentTarget.classList.toggle('is-loved')
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

        <p className="fabric-type">{scrap.type} · {scrap.pattern}</p>

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
  )
}

function Inventory({ onNavigate }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filteredScraps = scraps.filter((scrap) => {
    const matchesSearch = `${scrap.name} ${scrap.type} ${scrap.colorName}`
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesFilter = filter === 'All' || scrap.type === filter

    return matchesSearch && matchesFilter
  })

  return (
    <>
      <section className="hero-panel gingham">
        <div className="hero-paper">
          <span className="eyebrow">A LITTLE LESS WASTE, A LOT MORE WONDER</span>
          <h1>Your scraps,<br />their <span>second life.</span></h1>
          <p>
            Tiny pieces, big possibilities. Let's turn your leftover
            fabric into something lovely.
          </p>
          <button className="primary-button" onClick={() => onNavigate('match')}>
            Find something to make <span>↗</span>
          </button>
          <span className="hero-doodle" aria-hidden="true">✿</span>
          <span className="hero-sticker" aria-hidden="true">made<br />with ♡</span>
        </div>
      </section>

      <main className="inventory-main">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">YOUR LITTLE FABRIC LIBRARY</p>
            <h2>The scrap basket <span>♡</span></h2>
          </div>
          <div className="scrap-count">
            <strong>{filteredScraps.length.toString().padStart(2, '0')}</strong>
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

          <button
            className="add-button"
            onClick={() => alert('Next step: connect the camera and scrap scanner!')}
          >
            <span>＋</span> Add scrap
          </button>
        </div>

        <div className="filter-row" aria-label="Filter fabrics">
          {['All', 'Cotton', 'Linen', 'Rayon'].map((type) => (
            <button
              key={type}
              className={`filter-chip ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="collection-note">
          <span className="note-flower" aria-hidden="true">✿</span>
          <p><strong>Every little piece counts.</strong><br />
            You might be one scrap away from your next favourite thing.</p>
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
            <h2>Little scraps.<br />Lovely creations.</h2>
            <p>Ready to see what your fabric can become?</p>
            <button className="primary-button" onClick={() => onNavigate('match')}>
              Let's make something <span>♡</span>
            </button>
          </div>
        </section>
      </main>
    </>
  )
}

function OtherPage({ page, onNavigate }) {
  const content = {
    match: {
      eyebrow: 'YOUR NEXT LITTLE PROJECT',
      title: 'What shall we make?',
      description: 'Choose your fabric scraps and discover what you can create with them.',
      icon: '✂',
      action: 'Browse my scraps',
      target: 'inventory',
    },
    nearby: {
      eyebrow: 'MAKERS HELPING MAKERS',
      title: 'Good things are nearby.',
      description: 'Discover fabric scraps from other makers in your area and give them a second life.',
      icon: '⌖',
      action: 'Back to my basket',
      target: 'inventory',
    },
    requests: {
      eyebrow: 'A LITTLE NOTE FROM A MAKER',
      title: 'Sharing is caring.',
      description: 'Your fabric requests and sharing approvals will find a home here.',
      icon: '♡',
      action: 'Explore my scraps',
      target: 'inventory',
    },
  }

  const item = content[page]

  return (
    <main className="other-page">
      <section className="other-paper gingham">
        <div className="other-inner">
          <span className="eyebrow">{item.eyebrow}</span>
          <div className="other-icon">{item.icon}</div>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
          <button className="primary-button" onClick={() => onNavigate(item.target)}>
            {item.action} <span>↗</span>
          </button>
        </div>
      </section>
      <p className="coming-soon">A little more stitching to do here. Coming together soon!</p>
    </main>
  )
}

export default function App() {
  const [page, setPage] = useState('inventory')

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => setPage('inventory')} aria-label="ReThread home">
          <span className="brand-mark">r.</span>
          <span>Soochi<span className="brand-dot">✳</span></span>
        </button>
        <span className="header-note">made of little things <span>♡</span></span>
      </header>

      {page === 'inventory'
        ? <Inventory onNavigate={setPage} />
        : <OtherPage page={page} onNavigate={setPage} />}

      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`nav-item ${page === item.id ? 'selected' : ''}`}
            aria-current={page === item.id ? 'page' : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
