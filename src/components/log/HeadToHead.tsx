import type { SiegeModel } from "@/lib/siege";

export default function HeadToHead({ model }: { model: SiegeModel }) {
  const guilds = model.guilds.map((guild) => guild.name);
  const maxCell = Math.max(1, ...guilds.flatMap((row) => guilds.map((column) => (row === column ? 0 : model.h2h[row]?.[column] ?? 0))));
  const pairs = model.rivalries.slice(0, 8);
  const peak = Math.max(1, ...pairs.flatMap((pair) => [pair.aKills, pair.bKills]));

  return (
    <div className="grid2">
      <div className="card">
        <h2 className="sec">Top rivalries</h2>
        {pairs.map((pair) => (
          <div className="riv" key={`${pair.a}-${pair.b}`}>
            <b style={{ textAlign: "right", overflowWrap: "anywhere" }}>{pair.a}</b>
            <span className="num r k">{pair.aKills}</span>
            <span className="bl" style={{ width: `${(pair.aKills / peak) * 100}%` }} />
            <span className="br" style={{ width: `${(pair.bKills / peak) * 100}%` }} />
            <span className="num d">{pair.bKills}</span>
            <b style={{ overflowWrap: "anywhere" }}>{pair.b}</b>
          </div>
        ))}
      </div>
      <div className="card mx">
        <h2 className="sec">Kill matrix <span className="chip">row killed column</span></h2>
        <table>
          <thead>
            <tr>
              <th />
              {guilds.map((guild) => <th key={guild} title={guild}>{guild}</th>)}
            </tr>
          </thead>
          <tbody>
            {guilds.map((row, rowIndex) => (
              <tr key={row}>
                <th className="rh" title={row}>{row}</th>
                {guilds.map((column, columnIndex) => {
                  if (row === column) return <td key={column} className="self">—</td>;
                  const value = model.h2h[row]?.[column] ?? 0;
                  const tone = value / maxCell;
                  return (
                    <td
                      key={column}
                      title={`${row} killed ${value} ${column}`}
                      style={{
                        background: `rgba(61,220,151,${(tone * 0.85).toFixed(2)})`,
                        color: tone > 0.5 ? "#04130c" : "var(--tx)",
                        animationDelay: `${(rowIndex + columnIndex) * 25}ms`,
                      }}
                    >
                      {value || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
