import { Life } from '../api/upload/route';
import Timeline, { TimelineItem } from './Timeline';

interface LifeTimelineProps {
  lives: Life[];
}

function getRemainingSiegeTime(eventTimestamp: string): string {
  const [hours, minutes, seconds] = eventTimestamp.split(':').map(Number);
  const eventDate = new Date();
  eventDate.setHours(hours, minutes, seconds, 0);

  const siegeEndDate = new Date();
  siegeEndDate.setHours(21, 15, 0, 0); // 9:15 PM

  const diffMs = siegeEndDate.getTime() - eventDate.getTime();
  const totalSeconds = Math.round(diffMs / 1000);

  const sign = totalSeconds >= 0 ? '' : '-';
  const absTotalSeconds = Math.abs(totalSeconds);

  const remainingMinutes = Math.floor(absTotalSeconds / 60);
  const remainingSeconds = absTotalSeconds % 60;

  if (totalSeconds >= 0) {
    return `${remainingMinutes}m ${remainingSeconds}s remaining`;
  } else {
    return `${remainingMinutes}m ${remainingSeconds}s past end`;
  }
}

export default function LifeTimeline({ lives }: LifeTimelineProps) {
  if (!lives.length) {
    return <p className="text-center text-gray-500">No data available.</p>;
  }

  return (
    <div>
      {lives.map((life, index) => (
        <div key={index} className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-700 mb-4">Life #{index + 1}</h3>
          <Timeline>
            {life.kills.map((kill, killIndex) => (
              <TimelineItem key={killIndex} timestamp={getRemainingSiegeTime(kill.timestamp)}>
                <p className="text-green-700">Killed <span className="font-bold">{kill.playerName}</span></p>
              </TimelineItem>
            ))}
            {life.death && (
              <TimelineItem timestamp={getRemainingSiegeTime(life.death.timestamp)} isLast>
                <p className="text-red-700">Killed by <span className="font-bold">{life.death.playerName}</span></p>
              </TimelineItem>
            )}
          </Timeline>
        </div>
      ))}
    </div>
  );
}
