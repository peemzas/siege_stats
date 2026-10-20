export default function TrendLine({ values, label }: { values: number[]; label: string }) {
  const width = 520;
  const height = 140;
  const peak = Math.max(1, ...values);
  const x = (index: number) => (values.length <= 1 ? width / 2 : 16 + (index / (values.length - 1)) * (width - 32));
  const y = (value: number) => height - 18 - (value / peak) * (height - 36);
  const path = values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join("");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path className="ln" d={path} stroke="#f5c451" fill="none" pathLength={1} style={{ ["--len" as string]: 1 }} />
      {values.map((value, index) => (
        <circle key={`${index}-${value}`} cx={x(index)} cy={y(value)} r={3.5} fill="#f5c451" />
      ))}
    </svg>
  );
}
