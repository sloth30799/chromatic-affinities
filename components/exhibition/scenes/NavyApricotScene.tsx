export function NavyApricotScene() {
  const bubbles = Array.from({ length: 13 }, (_, index) => index);
  const dust = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div className="scene-art scene-art--navy-apricot" aria-hidden="true">
      <div className="navy-sky" />
      <div className="apricot-sky" />
      <div className="navy-haze" />
      <svg className="navy-current" viewBox="0 0 1440 450" preserveAspectRatio="none">
        <path d="M0 130C194 80 330 198 510 136S822 55 1010 122s279 8 430-35v363H0Z" />
        <path d="M0 190c214-57 318 91 543 26 226-66 357-19 533 38 181 58 269 6 364-40" />
      </svg>
      <div className="moon-peach" />
      <div className="moon-craters"><i /><i /><i /></div>
      <div className="peach-seam" />
      <div className="peach-leaf" />
      <div className="ocean-floor">
        <span /><span /><span /><span /><span />
      </div>
      <div className="desert-sand">
        <span /><span /><span />
      </div>
      <div className="feather"><span /><span /><span /><span /><span /></div>
      <div className="night-flower-scene"><i /><i /><i /><i /><i /><b /></div>
      <div className="peach-fruit"><i /><b /></div>
      <div className="bubble-field">
        {bubbles.map((bubble) => (
          <i key={bubble} className={`bubble bubble--${bubble + 1}`}><span /></i>
        ))}
      </div>
      <div className="dust-field">
        {dust.map((particle) => (
          <i key={particle} className={`dust dust--${particle + 1}`}><span /></i>
        ))}
      </div>
      <svg className="navy-waves" viewBox="0 0 1440 300" preserveAspectRatio="none">
        <path d="M0 118C165 57 300 173 472 117s278-69 442-2 360 70 526-25v210H0Z" />
        <path d="M0 179c143-53 272 53 443-9s257-68 451 0 331 29 546-38" />
      </svg>
      <div className="navy-vignette" />
    </div>
  );
}
