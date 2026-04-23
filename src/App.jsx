import { ArrowRight, BriefcaseBusiness, Gamepad2, Mail, Map, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { JungleMode } from "./JungleMode.jsx";
import { DetailModal } from "./components/DetailModal.jsx";
import { featuredWork, jungleLocations, profile, workItems } from "./content.js";

function App() {
  const [mode, setMode] = useState("portfolio");
  const [activeItemId, setActiveItemId] = useState(null);
  const activeItem = useMemo(
    () => workItems.find((item) => item.id === activeItemId),
    [activeItemId]
  );

  if (mode === "jungle") {
    return (
      <>
        <JungleMode
          onExit={() => setMode("portfolio")}
          onOpenDetails={(id) => setActiveItemId(id)}
        />
        <DetailModal item={activeItem} onClose={() => setActiveItemId(null)} />
      </>
    );
  }

  return (
    <main className="portfolio-shell">
      <PortfolioNav onEnterJungle={() => setMode("jungle")} />
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Jack's Jungle / Portfolio Mode</p>
            <h1>{profile.tagline}</h1>
            <p className="hero-lede">
              Pomona CS + Philosophy student building across AI systems, robotics, and
              strategy-facing products. Incoming BCG Associate with a builder's bias for
              useful tools.
            </p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => setMode("jungle")}>
                <Gamepad2 size={18} />
                Enter Jack's Jungle
              </button>
              <a className="secondary-action" href={`mailto:${profile.email}`}>
                <Mail size={17} />
                Contact
              </a>
            </div>
          </div>

          <aside className="signal-panel" aria-label="Credibility snapshot">
            <div className="panel-topline">
              <span>current signal</span>
              <span className="live-dot" />
            </div>
            <h2>{profile.name}</h2>
            <p>{profile.status}</p>
            <div className="signal-grid">
              <span>BCG AI workflows</span>
              <span>Robotics systems</span>
              <span>600K+ records analyzed</span>
              <span>3.97 GPA</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="mode-strip" aria-label="Explore mode preview">
        <div>
          <Map size={20} />
          <span>Switch into a full-screen pixel-world resume: Strategy Tower, Robotics Lab, Hacker House, Trophy Hall.</span>
        </div>
        <button onClick={() => setMode("jungle")}>
          Explore Mode
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Selected Work</p>
          <h2>Serious work first. Creative interface second.</h2>
        </div>
        <div className="work-grid">
          {featuredWork.map((item) => (
            <article className="work-card" key={item.id}>
              <div className="card-kicker">
                <BriefcaseBusiness size={15} />
                <span>{item.type}</span>
              </div>
              <h3>{item.title}</h3>
              <p className="role-line">{item.role}</p>
              <p>{item.signal}</p>
              <div className="metric-row">
                {item.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
              <button onClick={() => setActiveItemId(item.id)}>Open Details</button>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section two-column">
        <div className="section-heading">
          <p className="eyebrow">Experience Map</p>
          <h2>The same story, two interfaces.</h2>
        </div>
        <div className="timeline">
          {workItems.map((item) => (
            <button
              className="timeline-row"
              key={item.id}
              onClick={() => setActiveItemId(item.id)}
            >
              <span>{item.section}</span>
              <strong>{item.title}</strong>
              <em>{item.period}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="closing-band">
        <Sparkles size={19} />
        <p>
          The north star: brief a partner in the morning, ship a weird little tool at
          1 AM.
        </p>
        <button onClick={() => setMode("jungle")}>Enter Jack's Jungle</button>
      </section>

      <DetailModal item={activeItem} onClose={() => setActiveItemId(null)} />
    </main>
  );
}

function PortfolioNav({ onEnterJungle }) {
  return (
    <header className="site-nav">
      <a className="wordmark" href="#top" aria-label="Jack Chin home">
        <span className="wordmark-pixel" />
        Jack Chin
      </a>
      <nav>
        <a href={`mailto:${profile.email}`}>Contact</a>
        <button onClick={onEnterJungle}>Jack's Jungle</button>
      </nav>
    </header>
  );
}

export default App;
