export function CacaoIvoryScene() {
  const fibers = Array.from({ length: 18 }, (_, index) => index);
  return (
    <div className="scene-art scene-art--cacao-ivory" aria-hidden="true">
      <div className="cacao-backdrop" />
      <div className="ivory-backdrop" />
      <div className="soil-ridge"><i /><i /><i /><i /><i /><i /></div>
      <div className="cacao-pod">
        <div className="cacao-pod-half cacao-pod-half--left"><i /><i /></div>
        <div className="cacao-pod-half cacao-pod-half--right"><i /><i /></div>
        <b /><em />
      </div>
      <div className="porcelain-bloom"><i /><i /><i /><i /><i /><i /><b /></div>
      <div className="walnut-scene"><i /><i /><i /><b /></div>
      <div className="shell-scene"><i /><i /><i /><i /><b /></div>
      <div className="fiber-field">
        {fibers.map((fiber) => (
          <i key={fiber} className={`fiber fiber--${fiber + 1}`}><span /></i>
        ))}
      </div>
      <div className="paper-drift" />
    </div>
  );
}
