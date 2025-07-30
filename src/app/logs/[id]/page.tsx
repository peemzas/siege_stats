"use client";

import Image from 'next/image';
import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Link from 'next/link';

// Import components from the main app
import Accordion from '@/app/components/Accordion';
import SummaryCard from '@/app/components/SummaryCard';
import LifeTimeline from '@/app/components/LifeTimeline';
import Modal from '@/app/components/Modal';
import Podium from '@/app/components/Podium';
import { Result, PlayerStat } from '@/app/api/types/log.type';

// Create a client
const queryClient = new QueryClient();

// Wrap the component with the provider
export default function LogDetailWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <LogDetailPage />
    </QueryClientProvider>
  );
}

function LogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const logId = params.id as string;
  
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [activeTab, setActiveTab] = useState('player'); // 'player' or 'guild'
  const [playerFilterName, setPlayerFilterName] = useState('');

  // Fetch log data using React Query
  const { data: logData, isLoading, isError } = useQuery({
    queryKey: ['logDetail', logId],
    queryFn: async () => {
      const response = await fetch(`/api/logs/${logId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch log data');
      }
      return response.json();
    }
  });

  const results: Result | null = logData?.parsedData || null;

  // Create an efficient player lookup map
  const playerMap = useMemo(() => {
    if (!results?.playerResults) return new Map();
    
    const map = new Map();
    results.playerResults.forEach(player => {
      map.set(player.name, player);
    });
    return map;
  }, [results?.playerResults]);

  // Memoized function to efficiently get a player with their guild name
  const getPlayerWithGuildName = useCallback((playerName: string) => {
    return playerMap.get(playerName) || { guildName: '' };
  }, [playerMap]);

  // Derived state for player results
  const filteredPlayerResults = useMemo(() =>
    results
      ? (selectedGuild
        ? results.playerResults.filter(player => player.guildName === selectedGuild)
        : results.playerResults
      ).filter(player => player.name.toLowerCase().includes(playerFilterName.toLowerCase()))
      .sort((a, b) => b.totalPoints - a.totalPoints)
    : [],
    [results, selectedGuild, playerFilterName]
  );

  // Pre-process kill and death data for each player to avoid repeated lookups
  const processedPlayerData = useMemo(() => {
    if (!results) return new Map();
    
    const dataMap = new Map();
    
    results.playerResults.forEach(player => {
      // Pre-process kills data with guild names
      const processedKills = player.kills.map(kill => ({
        ...kill,
        guildName: getPlayerWithGuildName(kill.name).guildName || ''
      }));
      
      // Pre-process deaths data with guild names
      const processedDeaths = player.killedBy.map(death => ({
        ...death,
        guildName: getPlayerWithGuildName(death.name).guildName || ''
      }));
      
      dataMap.set(player.name, {
        processedKills,
        processedDeaths
      });
    });
    
    return dataMap;
  }, [results, getPlayerWithGuildName]);

  const topPlayers = useMemo(() => 
    results && results.playerResults.length > 0
      ? results.playerResults.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3)
      : [],
    [results]
  );

  const topGuilds = useMemo(() => 
    results && results.guildResults.length > 0
      ? results.guildResults.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3)
      : [],
    [results]
  );

  const mvpPlayer = useMemo(() => 
    results && results.playerResults.length > 0
      ? results.playerResults.reduce((mvp, player) => player.totalPoints > mvp.totalPoints ? player : mvp, results.playerResults[0])
      : null,
    [results]
  );

  const handleGuildFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGuild(event.target.value);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <div className="text-purple-700 font-semibold">Loading log data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
          <h2 className="text-red-700 text-xl font-semibold mb-4">Failed to load log data</h2>
          <p className="text-gray-700 mb-6">There was an error loading the log data. The log may have been deleted or there was a server error.</p>
          <Link href="/" className="inline-flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 to-teal-100 text-gray-800 font-sans">
      <nav className="top-0 z-50 h-20 bg-gradient-to-r from-blue-200 to-purple-200 flex items-center justify-between px-8 py-4">
        <Link href="/" className="left-section">
          <img src="/images/logo.png" alt="Logo" className="w-24 p-2"/>
        </Link>
        <div className="right-section flex items-center gap-4">
          <Link href="/" 
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-6 lg:p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            Log from {logData?.logDate ? new Date(logData.logDate).toLocaleDateString() : "Unknown Date"}
          </h1>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-8 w-full mb-8">
          {/* Player Podium Section */}
          {results && results.playerResults.length > 0 && (
            <Podium
              title="Top 3 Players"
              type="player"
              positions={topPlayers.map(player => player ? {
                name: player.name,
                subtitle: player.guildName,
                points: player.totalPoints,
                extraStat: {
                  label: `K/D`,
                  value: `${player.totalKills}/${player.totalDeaths}`
                }
              } : null)}
            />
          )}

          {/* Guild Podium Section */}
          {results && results.guildResults.length > 0 && (
            <Podium
              title="Top 3 Guilds"
              type="guild"
              positions={topGuilds.map(guild => guild ? {
                name: guild.name,
                points: guild.totalPoints,
                extraStat: {
                  label: `K/D`,
                  value: `${guild.totalKills}/${guild.totalDeaths}`
                }
              } : null)}
            />
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex">
          <button
            className={`px-6 py-3 rounded-t-lg font-semibold ${activeTab === 'player' ? 'bg-white text-gray-800' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            onClick={() => setActiveTab('player')}
          >
            Player Stats
          </button>
          <button
            className={`px-6 py-3 rounded-t-lg font-semibold ${activeTab === 'guild' ? 'bg-white text-gray-800' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            onClick={() => setActiveTab('guild')}
          >
            Guild Stats
          </button>
        </div>

        {/* Player Stats Tab Content */}
        {activeTab === 'player' && (
          <div className="bg-white p-6 rounded-b-2xl rounded-tr-2xl shadow-lg space-y-6">
            {/* Player Filter */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="player-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Player Name</label>
                <div className="relative">
                  <input
                    type="text"
                    id="player-filter"
                    placeholder="Enter player name..."
                    value={playerFilterName}
                    onChange={(e) => setPlayerFilterName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all duration-200"
                  />
                  {playerFilterName && (
                    <button
                      onClick={() => setPlayerFilterName('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      aria-label="Clear input"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="guild-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Guild</label>
                <select
                  id="guild-filter"
                  value={selectedGuild}
                  onChange={handleGuildFilterChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all duration-200"
                >
                  <option value="">All Guilds</option>
                  {results?.guildResults.map(guild => (
                    <option key={guild.name} value={guild.name}>
                      {guild.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="font-bold text-xl text-gray-800 mb-4">Player Stats</h2>
            <div className="space-y-4">
              {/* Column Headers */}
              <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg grid grid-cols-12 font-bold text-lg">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3 pl-12">Name</div>
                <div className="col-span-2">Guild</div>
                <div className="col-span-2">Points</div>
                <div className="col-span-2">Kills</div>
                <div className="col-span-2">Deaths</div>
              </div>
              
              {filteredPlayerResults.map((player, index) => {
                // Get pre-processed data for this player
                const playerData = processedPlayerData.get(player.name);
                
                return (
                  <Accordion
                    key={player.name}
                    bgColor={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    title={
                      <div className={`text-gray-600 text-md font-semibold w-full grid grid-cols-12 p-2 rounded-lg`}>
                        <div className="col-span-1 flex items-center py-1">{player.rank}</div>
                        <div className="col-span-3 flex items-center gap-2 py-1">
                          {player.class ? (
                            <div className="relative inline-block group">
                              <span className="absolute invisible group-hover:visible z-10 text-xs bg-gray-500 text-white px-2 py-1 rounded whitespace-nowrap transform -translate-x-1/4 bottom-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {player.class}
                              </span>
                              <Image
                                src={`/images/classes/${player.class}.png`}
                                alt={player.name}
                                width={30}
                                height={30}
                              />
                            </div>) : (
                            <span className="pl-8"></span>
                          )}
                          {player.name}
                        </div>
                        <div className="col-span-2 flex items-center py-1">{player.guildName}</div>
                        <div className="col-span-2 flex items-center py-1">{player.totalPoints}</div>
                        <div className="col-span-2 flex items-center pl-3 py-1">{player.totalKills}</div>
                        <div className="col-span-2 flex items-center pl-7 py-1">{player.totalDeaths}</div>
                      </div>
                    }
                  >
                    <div className="flex gap-4 ">
                      <div className="w-1/2">
                        <SummaryCard
                          title="Kills"
                          type="kills"
                          totalKillsOrDeaths={player.totalKills}
                          killsOrDeathsByPlayer={playerData ? playerData.processedKills : []}
                          killsOrDeathsByGuild={player.totalKillsEachGuild}
                        />
                      </div>
                      <div className="w-1/2">
                        <SummaryCard
                          title="Killed By"
                          type="killedBy"
                          totalKillsOrDeaths={player.totalDeaths}
                          killsOrDeathsByPlayer={playerData ? playerData.processedDeaths : []}
                          killsOrDeathsByGuild={player.totalDeathsEachGuild}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-6 mb-2 justify-center">
                      <button className="bg-gray-800 text-white p-2 rounded-lg" onClick={() => setSelectedPlayer(player)}>
                        Show timeline
                      </button>
                    </div>
                  </Accordion>
                );
              })}
            </div>
          </div>
        )}

        {/* Guild Stats Tab Content */}
        {activeTab === 'guild' && (
          <div className="bg-white p-6 rounded-b-2xl rounded-tr-2xl shadow-lg space-y-6">
            <div className="space-y-4">
              {/* Column Headers */}
              <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg grid grid-cols-12 font-bold text-lg">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3 pl-2">Name</div>
                <div className="col-span-2">Players</div>
                <div className="col-span-2">Points</div>
                <div className="col-span-2">Kills</div>
                <div className="col-span-2">Deaths</div>
              </div>
              
              {results.guildResults.map((guild, index) => (
                <Accordion
                  key={guild.name}
                  bgColor={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  title={
                    <div className={`text-gray-600 text-md font-semibold w-full grid grid-cols-12 p-2 rounded-lg`}>
                      <div className="col-span-1">{guild.rank}</div>
                      <div className="col-span-3">{guild.name}</div>
                      <div className="col-span-2">{guild.playerCount}</div>
                      <div className="col-span-2">{guild.totalPoints}</div>
                      <div className="col-span-2 pl-2">{guild.totalKills}</div>
                      <div className="col-span-2 pl-6">{guild.totalDeaths}</div>
                    </div>
                  }
                >
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <div className="rounded-xl shadow-md overflow-hidden h-full">
                        {/* Header section */}
                        <div className={`bg-sky-600 text-white p-4 flex justify-center items-center`}>
                          <span className="text-xl mr-2">📊</span>
                          <h3 className="font-bold text-lg">Guild Statistics</h3>
                        </div>
                        
                        {/* Body section */}
                        <div className={`p-6 h-full bg-sky-50`}>
                          {/* Points Section */}
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-700 border-b border-sky-200 pb-2 mb-3">Points Breakdown</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                                <div className="text-sm text-gray-500">Points from Kills</div>
                                <div className="text-xl font-bold text-amber-600">{guild.totalPointsFromKills}</div>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                                <div className="text-sm text-gray-500">Extra Life Points</div>
                                <div className="text-xl font-bold text-green-600">{guild.totalExtraLifePoints}</div>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm text-center border-2 border-amber-400">
                                <div className="text-sm text-gray-700">Total Points</div>
                                <div className="text-xl font-bold text-amber-800">{guild.totalPoints}</div>
                              </div>
                            </div>
                          </div>

                          {/* Performance Section */}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-700 border-b border-sky-200 pb-2 mb-3">Combat Performance</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm text-gray-700">Kills</div>
                                    <div className="text-xl font-bold text-teal-600">{guild.totalKills}</div>
                                  </div>
                                  <span className="text-2xl">💥</span>
                                </div>
                              </div>
                              <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm text-gray-700">Deaths</div>
                                    <div className="text-xl font-bold text-red-600">{guild.totalDeaths}</div>
                                  </div>
                                  <span className="text-2xl">☠️</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-gray-700">K/D Ratio</div>
                                  <div className="text-xl font-bold text-indigo-600">
                                    {guild.totalDeaths > 0 ? (guild.totalKills / guild.totalDeaths).toFixed(2) : guild.totalKills > 0 ? "∞" : "0"}
                                  </div>
                                </div>
                                <div className="text-xs bg-gray-100 rounded-full px-2 py-1">
                                  {guild.totalKills} / {guild.totalDeaths}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Player Count */}
                          <div className="mt-4 bg-gradient-to-r from-sky-100 to-sky-100 p-3 rounded-lg text-center">
                            <div className="text-sm text-gray-600">Total Players</div>
                            <div className="text-xl font-bold text-gray-800">{guild.playerCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-1/2">
                      <SummaryCard
                        title="Kills"
                        type="kills"
                        totalKillsOrDeaths={guild.totalKills}
                        killsOrDeathsByPlayer={guild.kills.sort((a, b) => b.count - a.count)}
                        killsOrDeathsByGuild={guild.kills.map(kill => ({ guildName: kill.name, count: kill.count }))}
                      />
                    </div>
                    <div className="w-1/2">
                      <SummaryCard
                        title="Killed By"
                        type="killedBy"
                        totalKillsOrDeaths={guild.totalDeaths}
                        killsOrDeathsByPlayer={guild.killedBy.sort((a, b) => b.count - a.count)}
                        killsOrDeathsByGuild={guild.killedBy.map(kill => ({ guildName: kill.name, count: kill.count }))}
                      />
                    </div>
                  </div>
                </Accordion>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline Modal */}
      {selectedPlayer && (
        <Modal isOpen onClose={() => setSelectedPlayer(null)}>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Kill Timeline: {selectedPlayer.name}</h2>
            <LifeTimeline lives={selectedPlayer.lives || []} />
          </div>
        </Modal>
      )}
    </div>
  );
}
