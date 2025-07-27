import { ReactNode } from 'react';

type PodiumPosition = {
  name: string;
  subtitle?: string;
  points: number;
  extraStat?: {
    label: string;
    value: number | string;
  };
};

type PodiumProps = {
  title: ReactNode;
  positions: (PodiumPosition | null)[];
  type: 'player' | 'guild';
};

export default function Podium({ title, positions, type }: PodiumProps) {
  // Define theme colors based on type
  const theme = {
    title: 'text-yellow-800',
    firstPlace: {
      card: 'from-yellow-50 to-yellow-200 border-yellow-400',
      text: 'text-amber-800',
      subtext: 'text-amber-700',
      stats: 'text-amber-900',
      statsDetails: 'text-amber-800',
    },
    secondPlace: {
      card: 'from-gray-100 to-gray-200 border-gray-300',
      text: 'text-gray-700',
      subtext: 'text-gray-600',
      stats: 'text-gray-800',
      statsDetails: 'text-gray-700',
    },
    thirdPlace: {
      card: 'from-red-50 to-red-200 border-red-300',
      text: 'text-red-700',
      subtext: 'text-red-600',
      stats: 'text-red-800',
      statsDetails: 'text-red-700',
    },
    emoji: ['🥇', '🥈', '🥉'],
  };
  
  // Define placement order for the podium (2nd, 1st, 3rd)
  const placementOrder = [1, 0, 2];
  const themeByPlace = [theme.firstPlace, theme.secondPlace, theme.thirdPlace];
  
  return (
    <div className={`w-full overflow-hidden rounded-2xl shadow-lg border-2 mb-8`}>
      <div className="w-full bg-black py-3 px-4">
        <span className={`text-white font-extrabold text-2xl text-center drop-shadow-md flex items-center justify-center gap-2`}>
          <span className="text-2xl animate-pulse">
            {type === 'player' ? '🎖️' : '🛡️'}
          </span>
          {title}
          <span className="text-2xl animate-pulse">
            {type === 'player' ? '🎖️' : '🛡️'}
          </span>
        </span>
      </div>
      
      <div className="p-6">
        <div className="flex justify-center items-end space-x-4 min-h-[18rem] relative">
          {placementOrder.map(orderIndex => {
            const item = positions[orderIndex];
            const placeTheme = themeByPlace[orderIndex];
            const zIndex = orderIndex === 0 ? 'z-10' : '';
            const scale = orderIndex === 0 ? 'hover:scale-110' : 'hover:scale-105';
            
            if (!item) return null;
            
            // Define fixed heights for each podium position with proper height differences
            const podiumHeight = orderIndex === 0 ? 'h-[300px]' : (orderIndex === 1 ? 'h-[220px]' : 'h-[180px]');
            
            return (
              <div 
                key={`podium-${orderIndex}`}
                className={`w-1/3 flex flex-col items-center transform ${scale} transition-transform duration-300 ${zIndex} justify-end w-[220px]`}
              >
                <div className={`bg-gradient-to-br ${placeTheme.card} w-full rounded-xl border${orderIndex === 0 ? '-2' : ''} shadow-${orderIndex === 0 ? 'xl' : 'lg'} px-3 py-4 flex flex-col justify-between overflow-hidden relative ${podiumHeight}`}>
                  {/* Position content in a consistent layout */}
                  <div className="flex flex-col mt-auto items-center text-center w-full">
                    {orderIndex === 0 && type === 'player' && <img src='/images/mvp.png' alt={`Place ${orderIndex + 1}`} className="w-20 h-20 mb-2 animate-bounce" />}
                    {orderIndex === 0 && type === 'guild' && <img src='/images/crown.png' alt={`Place ${orderIndex + 1}`} className="w-24 h-24 mb-2 animate-bounce" />}
                    {orderIndex !== 0 && <span className={`text-${orderIndex === 0 ? '3' : '2'}xl mb-2 animate-bounce`}>{theme.emoji[orderIndex]}</span>}
                    <p className={`font-${orderIndex === 0 ? 'extrabold' : 'bold'} ${placeTheme.text} text-${orderIndex === 0 ? 'xl' : 'lg'} truncate w-full text-center`}>
                      {item.name}
                    </p>
                    {item.subtitle && (
                      <p className={`${placeTheme.subtext} text-sm truncate w-full text-center`}>
                        ({item.subtitle})
                      </p>
                    )}
                  </div>
                  
                  {/* Fixed position for stats at the bottom */}
                  <div className="mt-auto text-center space-y-1 w-full">
                    <p className={`font-${orderIndex === 0 ? 'bold' : 'medium'} ${placeTheme.stats} truncate`}>
                      {item.points} Points
                    </p>
                    {item.extraStat && (
                      <p className={`${placeTheme.statsDetails} truncate`}>
                        {item.extraStat.label}: {item.extraStat.value}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
