const SAMPLES = [1, 2, 3, 4, 5, 10, 11, 12, 100, 101, 102, 103];

function range(count, offset) {
  return Array.from({ length: count }, (_, index) => offset + index);
}

function Belt({ direction, ids }) {
  const loop = ids.concat(ids);

  return (
    <div className={`belt ${direction}`}>
      <div className="belt-track">
        {loop.map((id, index) => (
          <article className="imp-card" key={`${id}-${index}`}>
            <img src={`/slideshow/${SAMPLES[id % SAMPLES.length]}.png`} alt={`Implingz #${id}`} width="84" height="84" />
            <p>Implingz #{id}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Collection() {
  return (
    <main className="collection">
      <Belt direction="right" ids={range(24, 1)} />
      <Belt direction="left" ids={range(24, 300)} />
      <Belt direction="right" ids={range(24, 1000)} />
    </main>
  );
}
