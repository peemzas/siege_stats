"use client";
import { useState, ChangeEvent, useMemo } from 'react';
import { Result, PlayerStat } from './api/upload/route';
import Accordion from './components/Accordion';
import SummaryCard from './components/SummaryCard';
import LifeTimeline from './components/LifeTimeline';
import Modal from './components/Modal';
import Podium from './components/Podium';

export default function Home() {
  const [results, setResults] = useState<Result | null>(null);
  const [logContent, setLogContent] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [activeTab, setActiveTab] = useState('player'); // 'player' or 'guild'
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const [playerFilterName, setPlayerFilterName] = useState(''); // New state for player name filter
  const [isDragging, setIsDragging] = useState(false); // State to track if a file is being dragged over

  // --- Existing Logic ---
  const processLogData = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const parsedData: Result = await response.json();
        setResults(parsedData);
        setSelectedGuild('');
      } else {
        console.error('Log processing failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error during log processing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processLogData(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processLogData(files[0]);
    }
  };

  const handleTextareaSubmit = () => {
    if (!logContent.trim()) return;
    const file = new File([logContent], "log.txt", { type: "text/plain" });
    processLogData(file);
  };

  const handleGuildFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedGuild(event.target.value);
  };

  // --- Derived State ---
  const filteredPlayerResults = useMemo(() =>
    results
      ? (selectedGuild
        ? results.playerResults.filter(player => player.guildName === selectedGuild)
        : results.playerResults
      ).filter(player => player.name.toLowerCase().includes(playerFilterName.toLowerCase())) // Apply player name filter
      .sort((a, b) => b.totalPoints - a.totalPoints)
    : [],
    [results, selectedGuild, playerFilterName] // Add playerFilterName to dependencies
  );

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

  const triggerFileUpload = () => {
    document.getElementById('file-upload')?.click();
  };

  // --- Render Logic ---
  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 to-teal-100 text-gray-800 font-mono">
        {isLoading && (
          <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-black text-2xl font-semibold flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Log...
            </div>
          </div>
        )}
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          <header className="text-center mb-12">
            <img src="/images/logo.png" alt="Logo" className="w-64 mb-4 inline-block" />
            <p className="text-lg text-gray-500 mt-3">
              Upload your game log to see the stats
            </p>
          </header>
          <div className="relative flex flex-row gap-6 my-8 max-w-6xl mx-auto">
            <div className="flex-1">
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-white rounded-xl shadow-lg w-full p-5 text-center transition-transform transform hover:scale-105 duration-300 block"
              >
                <div 
                  className={`border-4 border-dashed ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300'} rounded-lg p-10 m-5 transition-colors duration-300`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  <p className="text-gray-500 text-lg">
                    Drag & drop your file here or click to browse
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </label>
            </div>
            <div className="flex flex-col items-center justify-center px-2 h-80">
              <div className="w-1 bg-gray-200 h-40 rounded-t-full"></div>
              <span className="text-gray-500 font-medium my-2">OR</span>
              <div className="w-1 bg-gray-200 h-40 rounded-b-full"></div>
            </div>
            <div className="flex-1">
              <textarea
                className="w-full p-4 border-2 border-gray-200 rounded-xl shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-300"
                rows={10}
                placeholder="Paste your log data here..."
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
              ></textarea>
              <button
                onClick={handleTextareaSubmit}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Parse Log from Text
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-rose-100 to-teal-100 text-gray-800 font-mono">
        {isLoading && (
          <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-black text-2xl font-semibold flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Log...
            </div>
          </div>
        )}
        <nav className="top-0 z-50 h-20 bg-gradient-to-r from-blue-200 to-purple-200 flex items-center justify-between px-8 py-4 shadow-md">
          <div className="left-section">
            <img src="/images/logo.png" alt="Logo" className="w-24 mb-4" />
          </div>
          <div className="right-section">
            <button onClick={triggerFileUpload} className="bg-gradient-to-r from-pink-500 to-red-400 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload New Log
            </button>
          </div>
        </nav>
        <div className="bg-gradient-to-br from-rose-100 to-teal-100 text-gray-800 font-sans max-w-screen-xl mx-auto bg-gray-50 font-sans">
          <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
          <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row items-start justify-center gap-8 w-full">
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
                    <div className="col-span-3">Name</div>
                    <div className="col-span-2">Guild</div>
                    <div className="col-span-2">Points</div>
                    <div className="col-span-2">Kills</div>
                    <div className="col-span-2">Deaths</div>
                  </div>
                  
                  {filteredPlayerResults.map((player, index) => (
                    <Accordion
                      key={player.name}
                      bgColor={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      title={
                        <div className={`text-gray-600 text-md font-semibold w-full grid grid-cols-12 p-2 rounded-lg`}>
                          <div className="col-span-1">{player.rank}</div>
                          <div className="col-span-3">{player.name}</div>
                          <div className="col-span-2">{player.guildName}</div>
                          <div className="col-span-2">{player.totalPoints}</div>
                          <div className="col-span-2 pl-3">{player.totalKills}</div>
                          <div className="col-span-2 pl-7">{player.totalDeaths}</div>
                        </div>
                      }
                    >
                      <div className="flex gap-4 ">
                        <div className="w-1/2">
                          <SummaryCard
                            title="Kills"
                            type="kills"
                            totalKillsOrDeaths={player.totalKills}
                            killsOrDeathsByPlayer={player.kills.map(kill => ({
                              ...kill,
                              guildName: results.playerResults.find(p => p.name === kill.name)?.guildName || ''
                            }))}
                            killsOrDeathsByGuild={player.totalKillsEachGuild}
                          />
                        </div>
                        <div className="w-1/2">
                          <SummaryCard
                            title="Killed By"
                            type="killedBy"
                            totalKillsOrDeaths={player.totalDeaths}
                            killsOrDeathsByPlayer={player.killedBy.map(death => ({
                              ...death,
                              guildName: results.playerResults.find(p => p.name === death.name)?.guildName || ''
                            }))}
                            killsOrDeathsByGuild={player.totalDeathsEachGuild}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-4 justify-center">
                        <button className="bg-gray-800 text-white p-2 rounded-lg" onClick={() => setSelectedPlayer(player)}>
                        Show timeline
                        </button>
                      </div>
                    </Accordion>
                  ))}
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
                    <div className="col-span-3">Name</div>
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
          </main>
        </div>
        {selectedPlayer && (
          <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)}>
            <h2 className="text-2xl font-bold text-purple-700 mb-4">Timeline for {selectedPlayer.name}</h2>
            <LifeTimeline lives={selectedPlayer.lives || []} />
          </Modal>
        )}
      </div>
    </>
  );
}
