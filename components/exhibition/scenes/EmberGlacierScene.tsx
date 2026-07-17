export function EmberGlacierScene() {
  const sparks = Array.from({ length: 19 }, (_, index) => index);
  const crystals = Array.from({ length: 9 }, (_, index) => index);
  return (
    <div className="scene-art scene-art--ember-glacier" aria-hidden="true">
      <div className="ember-backdrop" />
      <div className="glacier-backdrop" />
      <div className="red-cliff red-cliff--one" /><div className="red-cliff red-cliff--two" />
      <div className="heat-haze" />
      <div className="ember-core"><i /><i /><i /><b /></div>
      <div className="ice-core"><i /><i /><i /><i /><i /><i /><b /></div>
      <div className="poppy-scene"><i /><i /><i /><i /><b /></div>
      <div className="koi-scene"><i /><i /><b /></div>
      <div className="spark-field">
        {sparks.map((spark) => (
          <i key={spark} className={`spark spark--${spark + 1}`}><span /></i>
        ))}
      </div>
      <div className="crystal-field">
        {crystals.map((crystal) => (
          <i key={crystal} className={`crystal crystal--${crystal + 1}`}><span /></i>
        ))}
      </div>
      <div className="glacier-water" />
    </div>
  );
}
