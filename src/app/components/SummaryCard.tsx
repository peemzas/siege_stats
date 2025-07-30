import { useEffect, useRef, useState, memo } from 'react';
import Chart from 'chart.js/auto';
import { ArcElement, Tooltip, Legend } from 'chart.js';

// Register required Chart.js components
Chart.register(ArcElement, Tooltip, Legend);

interface KillSummaryCardProps {
  title: string;
  type: string;
  totalKillsOrDeaths: number;
  killsOrDeathsByPlayer: { name: string; guildName?: string; count: number }[];
  killsOrDeathsByGuild?: { guildName: string; count: number }[]; // Optional, for pie chart
}

// Memoize the component to prevent unnecessary re-renders
const SummaryCard = memo(function SummaryCard({ 
  title, 
  type, 
  totalKillsOrDeaths, 
  killsOrDeathsByPlayer, 
  killsOrDeathsByGuild 
}: KillSummaryCardProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isChartVisible, setIsChartVisible] = useState(false);
  
  // Only initialize chart when it's visible in viewport
  useEffect(() => {
    // Use IntersectionObserver to detect when chart is visible
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window && chartRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsChartVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      
      observer.observe(chartRef.current);
      return () => observer.disconnect();
    } else {
      // Fallback for browsers without IntersectionObserver
      setIsChartVisible(true);
    }
  }, []);

  // Create or update chart when killsByGuild changes and chart is visible
  useEffect(() => {
    if (isChartVisible && killsOrDeathsByGuild && killsOrDeathsByGuild.length > 0 && chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Generate colors based on guild count (use consistent colors)
      const generateColors = (count: number) => {
        const baseColors = [
          'rgba(255, 99, 132, 0.8)',   // red
          'rgba(54, 162, 235, 0.8)',   // blue
          'rgba(255, 206, 86, 0.8)',   // yellow
          'rgba(75, 192, 192, 0.8)',   // teal
          'rgba(153, 102, 255, 0.8)',  // purple
          'rgba(255, 159, 64, 0.8)',   // orange
          'rgba(46, 204, 113, 0.8)',   // green
        ];
        
        return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length]);
      };

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        // Small timeout to prevent UI blocking during rendering
        setTimeout(() => {
          // Create new chart
          chartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: killsOrDeathsByGuild.map(guild => guild.guildName),
              datasets: [{
                data: killsOrDeathsByGuild.map(guild => guild.count),
                backgroundColor: generateColors(killsOrDeathsByGuild.length),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                      const percentage = Math.round((value * 100) / total);
                      return `${label}: ${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        }, 0);
      }
    }
    
    // Clean up chart on component unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [killsOrDeathsByGuild, isChartVisible]);

  // Memoized player list renderer
  const renderPlayerList = () => {
    if (!killsOrDeathsByPlayer || killsOrDeathsByPlayer.length === 0) {
      return <div className="p-3 text-gray-500 text-center">No data available</div>;
    }
    
    return killsOrDeathsByPlayer.map(player => (
      <div 
        key={player.name} 
        className={`
          flex justify-between p-3 
          ${type === 'kills' ? 'bg-emerald-50' : 'bg-red-50'} 
          border-b 
          ${type === 'kills' ? 'border-emerald-200' : 'border-red-200'} 
          last:border-b-0
        `}
      >
        <span className="font-medium relative inline-block group">
          {player.name}
          {player.guildName && (
            <span className="absolute invisible group-hover:visible bg-gray-700 text-white text-xs rounded py-1 px-2 -mt-10 -left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-1 text-center">
              Guild [{player.guildName}]
            </span>
          )}
        </span>
        <span className={`font-bold ${type === 'kills' ? 'text-emerald-700' : 'text-red-700'}`}>{player.count}</span>
      </div>
    ));
  };

  return (
    <div className="rounded-xl shadow-md overflow-hidden h-full">
      {/* Header section */}
      <div className={`${type === 'kills' ? 'bg-teal-800' : 'bg-red-800'} text-white p-4 flex justify-center items-center`}>
        <span className="text-xl mr-2">{type === 'kills' ? '💥' : '☠️'}</span>
        <h3 className="font-bold text-lg">{title} ({totalKillsOrDeaths})</h3>
      </div>
      
      {/* Body section */}
      <div className={`p-4 ${type === 'kills' ? 'bg-teal-100' : 'bg-red-100'} h-full`}>
        {/* Pie chart section */}
        {killsOrDeathsByGuild && killsOrDeathsByGuild.length > 0 && (
          <div className="mb-4">
            <div className="h-60 w-full">
              <canvas ref={chartRef} />
              {!isChartVisible && (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-pulse text-gray-500">Loading chart...</div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Player kills list */}
        {killsOrDeathsByPlayer && killsOrDeathsByPlayer.length > 0 && (
          <div>
            <div className={`${type === 'kills' ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg overflow-hidden border ${type === 'kills' ? 'border-emerald-200' : 'border-red-200'} shadow-sm`}>
              <div className="max-h-64 overflow-y-auto">
                {renderPlayerList()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default SummaryCard;
