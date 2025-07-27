"use client";
import { useState, ChangeEvent, useMemo } from 'react';
import { Result, PlayerStat } from './api/upload/route';
import Accordion from './components/Accordion';
import ExpandableList from './components/ExpandableList';
import LifeTimeline from './components/LifeTimeline';
import Modal from './components/Modal';

export default function Home() {
  const [results, setResults] = useState<Result | null>(null);
  const [logContent, setLogContent] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [activeTab, setActiveTab] = useState('player'); // 'player' or 'guild'
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const [playerFilterName, setPlayerFilterName] = useState(''); // New state for player name filter

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

  const handleTextareaSubmit = () => {
    if (!logContent.trim()) return;
    const file = new File([logContent], "log.txt", { type: "text/plain" });
    processLogData(file);
  };

  const handleGuildFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedGuild(event.target.value);
  };

  // --- Derived State ---
  const uniqueGuilds = useMemo(() => 
    results ? [...new Set(results.playerResults.map(p => p.guildName).filter(g => g))].sort() : [],
    [results]
  );

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

  const filteredGuildResults = useMemo(() =>
    results
      ? (selectedGuild
        ? results.guildResults.filter(guild => guild.name === selectedGuild)
        : results.guildResults
      ).sort((a, b) => b.totalPoints - a.totalPoints)
    : [],
    [results, selectedGuild]
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
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          <header className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-red-400 text-shadow-lg text-shadow-color-black">
              Siege Stats
            </h1>
            <p className="text-lg text-gray-500 mt-3">
              Upload your game log to see the stats
            </p>
          </header>
          <div className="flex justify-center mb-6">
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-white rounded-xl shadow-lg p-8 w-full max-w-lg text-center transition-transform transform hover:scale-105 duration-300"
            >
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-10">
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
          <div className="relative flex items-center my-8 max-w-lg mx-auto">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 font-semibold">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          <div className="flex flex-col items-center w-full max-w-lg mx-auto mb-12">
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
              {isLoading ? 'Processing...' : 'Parse Log from Text'}
            </button>
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
        <nav className="sticky top-0 z-50 h-20 bg-gradient-to-r from-blue-200 to-purple-200 flex items-center justify-between px-8 py-4 shadow-md">
          <div className="left-section">
            <h1 className="font-bold text-2xl text-gray-800 tracking-wide">Siege Stats</h1>
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
          <main className="flex mt-8 gap-8 px-8 pb-8">
            <aside className="w-1/4 flex-none">
              <div className="bg-white p-4 rounded-2xl shadow-lg space-y-6">
                {/* Winner Guild Display */}
                {results && results.guildResults.length > 0 && (
                  <div className="bg-yellow-100 p-4 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg text-yellow-800 mb-3">Winner Guild</h3>
                    <div className="flex items-center gap-4">
                      <img src="/images/crown.png" alt="Crown Icon" className="w-8 h-8" />
                      <p className="font-semibold text-lg text-gray-800">{results.guildResults[0].name}</p>
                    </div>
                  </div>
                )}

                {mvpPlayer && (
                  <div className="bg-yellow-100 p-4 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg text-yellow-800 mb-3">MVP Player</h3>
                    <div className="flex items-center gap-4">
                      <img src="/images/mvp.png" alt="MVP Icon" className="w-8 h-8" />
                      <div>
                        <p className="font-semibold text-lg text-gray-800">{mvpPlayer.name}</p>
                        <p className="text-sm text-gray-600">{mvpPlayer.guildName}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={() => mvpPlayer && setSelectedPlayer(mvpPlayer)} disabled={!mvpPlayer} className="w-full py-3 rounded-full shadow-sm hover:shadow-md transition-all duration-200 ease-in-out bg-blue-200 text-blue-800 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View MVP Timeline
                </button>
              </div>
            </aside>

            <section className="w-3/4 flex-grow">
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
                  {/* Filter by Guild */}
                  <div>
                    <label htmlFor="guild-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Guild</label>
                    <select id="guild-filter" value={selectedGuild} onChange={handleGuildFilterChange} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200">
                      <option value="">All Guilds</option>
                      {uniqueGuilds.map(guild => <option key={guild} value={guild}>{guild}</option>)}
                    </select>
                  </div>
                  <h2 className="font-bold text-xl text-gray-800 mb-4">Player Stats: Kill List</h2>
                  {/* Player Name Filter */}
                  <div className="mb-4">
                    <label htmlFor="player-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Player Name</label>
                    <input
                      type="text"
                      id="player-filter"
                      value={playerFilterName}
                      onChange={(e) => setPlayerFilterName(e.target.value)}
                      placeholder="Search player..."
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-4">
                    {filteredPlayerResults.map(player => {
                      const kdRatio = player.totalDeaths > 0 ? (player.totalKills / player.totalDeaths).toFixed(2) : player.totalKills.toFixed(2);
                      return (
                        <Accordion
                          key={player.name}
                          title={
                            <div className="w-full flex justify-between items-center">
                              <span className="font-semibold text-lg text-purple-800">{player.name} ({player.guildName})</span>
                              <span className="text-purple-600 font-medium">{player.totalPoints} Points | {player.totalKills} Kills / {player.totalDeaths} Deaths ({kdRatio} K/D)</span>
                            </div>
                          }
                        >
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="font-bold text-lg text-green-600 mb-3">Kills ({player.totalKills})</h4>
                            <div className="font-semibold text-md text-green-600 mb-3">Summary each guild</div>
                            <div className="grid grid-cols-1 pl-3 sm:grid-cols-2 gap-2 mb-3">
                              {player.totalKillsEachGuild.map((kill: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100 transition-all hover:bg-green-100">
                                  <span className="text-green-800 font-medium">{kill.guildName}</span>
                                  <span className="font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">{kill.count}</span>
                                </div>
                              ))}
                            </div>
                            <div className="font-semibold text-md text-green-600 mb-3">Summary each Player</div>
                            <ExpandableList
                              items={player.kills}
                              renderItem={(kill: any, i: number) => (
                                <li key={i} className="flex justify-between items-center bg-green-50 p-3 mb-1.5 rounded-lg border border-green-100 transition-all hover:shadow-sm hover:bg-green-100">
                                  <span className="text-green-800 font-medium">{kill.name}</span>
                                  <span className="font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">{kill.count}</span>
                                </li>
                              )}
                            />
                            <hr className="my-4 border-gray-200" />
                            <div className="font-semibold text-md text-red-600 mb-3 mt-4">Killed By ({player.totalDeaths})</div>
                            <div className="font-semibold text-md text-red-600 mb-3">Summary each guild</div>
                            <div className="grid grid-cols-1 pl-3 sm:grid-cols-2 gap-2 mb-3">
                              {player.totalDeathsEachGuild.map((kill: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100 transition-all hover:bg-red-100">
                                  <span className="text-red-800 font-medium">{kill.guildName}</span>
                                  <span className="font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{kill.count}</span>
                                </div>
                              ))}
                            </div>
                            <div className="font-semibold text-md text-red-600 mb-3">Summary each player</div>
                            <ExpandableList
                              items={player.killedBy}
                              renderItem={(death: any, i: number) => (
                                <li key={i} className="flex justify-between items-center bg-red-50 p-3 mb-1.5 rounded-lg border border-red-100 transition-all hover:shadow-sm hover:bg-red-100">
                                  <span className="text-red-800 font-medium">{death.name}</span>
                                  <span className="font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{death.count}</span>
                                </li>
                              )}
                            />
                            <div className="text-center mt-4">
                              <button
                                onClick={() => setSelectedPlayer(player)}
                                className="px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-600 transition-all duration-300"
                              >
                                Show Timeline
                              </button>
                            </div>
                          </div>
                        </Accordion>
                      )}
                    )}
                  </div>
                </div>
              )}

              {/* Guild Stats Tab Content */}
              {activeTab === 'guild' && (
                <div className="bg-white p-6 rounded-b-2xl rounded-tr-2xl shadow-lg space-y-6">
                  {/* Filter by Guild */}
                  <div>
                    <label htmlFor="guild-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Guild</label>
                    <select id="guild-filter" value={selectedGuild} onChange={handleGuildFilterChange} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200">
                      <option value="">All Guilds</option>
                      {uniqueGuilds.map(guild => <option key={guild} value={guild}>{guild}</option>)}
                    </select>
                  </div>
                  <h2 className="font-bold text-xl text-gray-800 mb-4">Guild Stats</h2>
                  <div className="space-y-4">
                    {filteredGuildResults.map(guild => (
                      <Accordion
                        key={guild.name}
                        title={
                          <div className="w-full flex justify-between items-center">
                            <span className="font-semibold text-lg text-purple-800">{guild.name}</span>
                            <span className="text-purple-600 font-medium">{guild.totalPoints} points</span>
                          </div>
                        }
                      >
                        <div className="pt-4 border-t border-gray-200">
                          <div className="mb-4 grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg shadow-sm text-center">
                              <p className="text-sm text-blue-700">Players</p>
                              <p className="font-bold text-xl text-blue-900">{guild.playerCount}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg shadow-sm text-center">
                              <p className="text-sm text-green-700">Kills Points</p>
                              <p className="font-bold text-xl text-green-900">{guild.totalPointsFromKills}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg shadow-sm text-center">
                              <p className="text-sm text-purple-700">Extra Life Points</p>
                              <p className="font-bold text-xl text-purple-900">{guild.totalExtraLifePoints}</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-lg shadow-sm text-center">
                              <p className="text-sm text-yellow-700">Total Points</p>
                              <p className="font-bold text-xl text-yellow-900">{guild.totalPoints}</p>
                            </div>
                          </div>
                          <h4 className="font-semibold text-md text-green-600 mb-2">Kills ({guild.totalKills})</h4>
                          <ExpandableList
                            items={guild.kills}
                            renderItem={(kill: any, i: number) => (
                              <li key={i} className="flex justify-between items-center bg-green-50 p-3 mb-1.5 rounded-lg border border-green-100 transition-all hover:shadow-sm hover:bg-green-100">
                                <span className="text-green-800 font-medium">{kill.name}</span>
                                <span className="font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">{kill.count}</span>
                              </li>
                            )}
                          />
                          <h4 className="font-semibold text-md text-red-600 mb-2 mt-4">Killed By ({guild.totalDeaths})</h4>
                          <ExpandableList
                            items={guild.killedBy}
                            renderItem={(death: any, i: number) => (
                              <li key={i} className="flex justify-between items-center bg-red-50 p-3 mb-1.5 rounded-lg border border-red-100 transition-all hover:shadow-sm hover:bg-red-100">
                                <span className="text-red-800 font-medium">{death.name}</span>
                                <span className="font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{death.count}</span>
                              </li>
                            )}
                          />
                        </div>
                      </Accordion>
                    ))}
                  </div>
                </div>
              )}
            </section>
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
