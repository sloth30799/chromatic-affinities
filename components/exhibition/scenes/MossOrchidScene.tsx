export function MossOrchidScene() {
  const spores = Array.from({ length: 22 }, (_, index) => index);
  return (
    <div className="scene-art scene-art--moss-orchid" aria-hidden="true">
      <div className="moss-backdrop" />
      <div className="orchid-backdrop" />
      <div className="fern fern--left"><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="fern fern--right"><i /><i /><i /><i /><i /><i /></div>
      <div className="wet-stone"><span /><span /><span /><b /></div>
      <div className="orchid-flower">
        <i /><i /><i /><i /><i /><i /><b /><em />
      </div>
      <div className="beetle-wing"><i /><i /><b /></div>
      <div className="spore-field">
        {spores.map((spore) => (
          <i key={spore} className={`spore spore--${spore + 1}`}><span /></i>
        ))}
      </div>
      <div className="moss-foreground"><i /><i /><i /><i /><i /></div>
    </div>
  );
}
