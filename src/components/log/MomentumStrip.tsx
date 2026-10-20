import { guildColor, type MomentumBlock } from "@/lib/siege";

export default function MomentumStrip({ blocks, guilds }: { blocks: MomentumBlock[]; guilds: string[] }) {
  if (!blocks.length) return null;
  return (
    <section className="card" style={{ marginTop: 16 }} aria-label="Momentum">
      <h2 className="sec">Momentum <span className="chip">10-minute blocks</span></h2>
      <div className="mom">
        {blocks.map((block, index) => {
          const place = guilds.indexOf(block.guild);
          const color = guildColor(place < 0 ? GUILD_FALLBACK : place);
          return (
            <div className="blk" key={`${block.startLabel}-${block.guild}`} style={{ animationDelay: `${index * 50}ms`, borderTopColor: color }}>
              <small className="num">{block.startLabel}–{block.endLabel}</small>
              <b>{block.guild}</b>
              <span className="n num" style={{ color }}>{block.kills}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const GUILD_FALLBACK = 99;
