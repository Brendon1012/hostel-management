import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, HeartHandshake, MapPin, ShieldCheck, Sparkles, Utensils, Wifi, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from './Brand.jsx'

const facilities = [
  { icon: Wifi, title: 'Stay connected', text: 'Fast, reliable Wi-Fi in every room and shared space.' },
  { icon: ShieldCheck, title: 'Feel at home', text: '24/7 care, secure access, and a team that knows you.' },
  { icon: Utensils, title: 'Good food, daily', text: 'Freshly prepared meals served with a little extra love.' },
  { icon: Wind, title: 'Room to recharge', text: 'Thoughtfully furnished rooms with everything you need.' },
]

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="site-nav">
        <a href="#home" className="brand-link" aria-label="JMR home"><Brand /></a>
        <nav className="site-links" aria-label="Main navigation">
          <a href="#living">The JMR life</a><a href="#rooms">Accommodation</a><a href="#dining">Dining</a><a href="#contact">Contact</a>
        </nav>
        <div className="nav-actions"><Link to="/login" className="nav-login">Sign in</Link><Link to="/login" className="button button-gold button-small">Resident portal <ArrowUpRight size={15} /></Link></div>
      </header>

      <section className="hero" id="home">
        <div className="hero-image" role="img" aria-label="Warm, contemporary residence lounge" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="eyebrow eyebrow-gold"><span className="eyebrow-line" />A place to belong</span>
          <h1>Welcome to JMR<br /><span>– Jerry Manuel Residence</span></h1>
          <p>Comfort, Community, and Care —<br className="desktop-break" /> All Under One Roof.</p>
          <div className="hero-actions"><a className="button button-gold" href="#living">Discover JMR <ArrowRight size={17} /></a><Link className="button button-outline-light" to="/login">Resident login</Link></div>
          <div className="hero-foot"><span><MapPin size={15} /> A place to call your own</span><a href="#living">Scroll to explore <ArrowDown size={14} /></a></div>
        </div>
        <div className="hero-note"><span className="note-dot" /> MADE FOR THE NEXT CHAPTER</div>
      </section>

      <section className="intro-section" id="living">
        <div className="intro-copy">
          <span className="eyebrow"><span className="eyebrow-line" />More than a room</span>
          <h2>Your own space.<br />Your kind of <em>community.</em></h2>
          <p>JMR is where new beginnings feel a little less new. Thoughtful spaces, good people, and the care you need to make the most of every day.</p>
          <a href="#rooms" className="text-link">Find your place at JMR <ArrowRight size={16} /></a>
        </div>
        <div className="intro-image-wrap"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85" alt="Natural light filling a relaxed, modern shared lounge" /><div className="image-caption"><Sparkles size={15} /><span>Made for living well</span></div></div>
        <div className="intro-stat"><strong>01</strong><span>ONE RESIDENCE.<br />A THOUSAND STORIES.</span></div>
      </section>

      <section className="facility-section">
        <div className="section-heading"><div><span className="eyebrow eyebrow-gold"><span className="eyebrow-line" />The little things matter</span><h2>Care in every <em>corner.</em></h2></div><p>Everything is considered, so you can focus on what matters most — living, learning, and finding your people.</p></div>
        <div className="facility-grid">{facilities.map(({ icon: Icon, title, text }, i) => <article className="facility-card" key={title}><div className="facility-icon"><Icon size={21} strokeWidth={1.6} /></div><span className="facility-number">0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="rooms-section" id="rooms">
        <div className="rooms-photo"><img src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85" alt="Comfortable, sunlit resident room" /><div className="photo-label"><span>THE JMR STANDARD</span><strong>Rest easy.<br />Wake inspired.</strong></div></div>
        <div className="rooms-copy"><span className="eyebrow"><span className="eyebrow-line" />Find your rhythm</span><h2>A room that<br />feels like <em>yours.</em></h2><p>Come back to a calm, comfortable space made for winding down and gearing up again. All the essentials, considered details, and room to make it your own.</p><ul><li><Check size={15} /> Comfortable, furnished rooms</li><li><Check size={15} /> Secure personal storage</li><li><Check size={15} /> Welcoming shared spaces</li></ul><Link className="text-link" to="/login">Explore resident services <ArrowRight size={16} /></Link></div>
      </section>

      <section className="dining-section" id="dining">
        <div className="dining-text"><span className="eyebrow eyebrow-gold"><span className="eyebrow-line" />Gather around</span><h2>Good food.<br /><em>Good company.</em></h2><p>Meals are more than what’s on the plate. They’re a reason to pause, catch up, and feel part of something.</p><div className="dining-hours"><Clock3 size={17} /><span><strong>Made fresh, served daily</strong><small>Breakfast · Lunch · Snacks · Dinner</small></span></div></div>
        <div className="dining-image"><img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1100&q=85" alt="Freshly prepared shared meal" /></div>
      </section>

      <section className="closing-section"><div className="closing-orbit" /><span className="eyebrow eyebrow-gold"><span className="eyebrow-line" />Your next chapter starts here</span><h2>Come as you are.<br /><em>Feel right at home.</em></h2><p>A warm welcome is just one step away.</p><Link to="/login" className="button button-gold">Get started <ArrowRight size={17} /></Link></section>

      <footer className="site-footer" id="contact"><div className="footer-top"><div><Brand light /><p>A place to belong, a space to grow.<br />Jerry Manuel Residence.</p></div><div className="footer-contact"><span>COME SAY HELLO</span><a href="mailto:hello@jmr-residence.in">hello@jmr-residence.in</a><a href="tel:+914422001234">+91 44 2200 1234</a></div><div className="footer-contact"><span>HERE FOR YOU</span><p>Resident support<br />Monday – Saturday, 9am–6pm</p></div><Link to="/login" className="footer-portal">Resident portal <ArrowUpRight size={16} /></Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Jerry Manuel Residence</span><span>Comfort, community & care.</span></div></footer>
    </main>
  )
}
