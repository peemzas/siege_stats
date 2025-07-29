"use client";
import { useState, ChangeEvent, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  QueryClient, 
  QueryClientProvider, 
  useQuery
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface LogDate {
  id: string;
  logDate: string;
  serverName: string;
}

interface ServerInfo {
  name: string;
  count: number;
}

// List of available game servers
const GAME_SERVERS = [
  { id: 'Lawolf', name: 'Lawolf' },
  { id: 'Mia', name: 'Mia' },
  { id: 'Glaphan', name: 'Glaphan' },
  { id: 'Rhisis', name: 'Rhisis' },
];

// Create a client
const queryClient = new QueryClient();

// Wrap the component with the provider
export default function HomeWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
}

function Home() {
  const router = useRouter();
  const [logContent, setLogContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<'upload' | 'view'>('upload');
  const [selectedServer, setSelectedServer] = useState(GAME_SERVERS[0].name);
  const [selectedViewServer, setSelectedViewServer] = useState<string | null>(null);

  // Using React Query to fetch servers list
  const { 
    data: availableServers = [], 
    isLoading: isLoadingServers,
    refetch: refetchServers
  } = useQuery<ServerInfo[]>({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch servers');
      }
      const data = await response.json();
      return data.servers || [];
    }
  });

  // Using React Query to fetch logs for a specific server
  const {
    data: serverLogs = [],
    isLoading: isLoadingLogs,
    refetch: refetchServerLogs
  } = useQuery<LogDate[]>({
    queryKey: ['serverLogs', selectedViewServer],
    queryFn: async () => {
      if (!selectedViewServer) return [];
      
      const response = await fetch(`/api/logs?serverName=${encodeURIComponent(selectedViewServer)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs for server');
      }
      return response.json();
    },
    enabled: !!selectedViewServer // Only run query when a server is selected
  });

  // Fetch available servers on component mount
  useEffect(() => {
    refetchServers();
  }, [refetchServers]);

  // --- Log Processing Logic ---
  const processLogData = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      if (viewMode === 'upload' && selectedDate) {
        // Save to database with date and server
        formData.append('logDate', selectedDate.toISOString());
        formData.append('serverName', selectedServer);
        
        const response = await fetch('/api/logs', { method: 'POST', body: formData });
        
        if (response.ok) {
          const data = await response.json();
          
          // Navigate to the log detail page
          router.push(`/logs/${data.id}`);
          
          // Refresh available servers
          refetchServers();
        } else {
          console.error('Log processing failed:', response.status, await response.text());
        }
      } else {
        // Just parse without saving (old behavior)
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (response.ok) {
          const data = await response.json();
          router.push(`/logs/${data.id}`);
        } else {
          console.error('Log processing failed:', response.status, await response.text());
        }
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

  const navigateToLogDetail = (logId: string) => {
    router.push(`/logs/${logId}`);
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 to-teal-100 text-gray-800 font-sans">
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
        <header className="text-center mb-8">
          <img src="/images/logo.png" alt="Logo" className="w-48 md:w-64 mb-4 inline-block p-2" />
          <p className="text-lg text-gray-600 mt-2">
            Upload your game log to see the stats
          </p>
          
          {/* View/Upload Mode Toggle Buttons - Moved below logo */}
          <div className="mt-6 inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-6 py-3 text-sm font-medium border rounded-l-lg transition-all ${
                viewMode === 'upload'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('upload')}
            >
              Upload New Log
            </button>
            <button
              type="button"
              className={`px-6 py-3 text-sm font-medium border rounded-r-lg transition-all ${
                viewMode === 'view'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => {
                setViewMode('view');
                setSelectedViewServer(null);
              }}
            >
              View Saved Logs
            </button>
          </div>
        </header>

        {viewMode === 'upload' ? (
          <div className="max-w-6xl mx-auto">
            {/* Server Select and Date Picker for Upload */}
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <div className="w-full md:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select server:
                </label>
                <select
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm"
                >
                  {GAME_SERVERS.map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-full md:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select log date:
                </label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  className="w-full text-center p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  dateFormat="dd MMM yyyy"
                  dropdownMode="select"
                  placeholderText="Select a date"
                />
              </div>
            </div>

            <div className="relative flex flex-col md:flex-row gap-6 my-8 max-w-6xl mx-auto">
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
              <div className="hidden md:flex flex-col items-center justify-center px-2 h-80">
                <div className="w-1 bg-gray-200 h-40 rounded-t-full"></div>
                <span className="text-gray-500 font-medium my-2">OR</span>
                <div className="w-1 bg-gray-200 h-40 rounded-b-full"></div>
              </div>
              <div className="md:hidden flex justify-center my-4">
                <span className="text-gray-500 font-medium px-4 py-2 border-t border-b border-gray-300">OR</span>
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
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
            {/* View mode: First select server, then see logs from that server */}
            {!selectedViewServer ? (
              // Step 1: Server selection
              <div>
                <h2 className="text-xl font-bold mb-6 text-center">Select Server</h2>
                {isLoadingServers ? (
                  <div className="p-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                    <p className="mt-4 text-gray-500">Loading server list...</p>
                  </div>
                ) : availableServers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {availableServers.map((server) => (
                      <button
                        key={server.name}
                        onClick={() => setSelectedViewServer(server.name)}
                        className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-gray-200 rounded-lg flex items-center justify-between hover:shadow-md transition-all duration-200 transform hover:translate-y-[-2px]"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-semibold text-lg">{server.name}</span>
                          <span className="text-sm text-gray-500">{server.count} log{server.count !== 1 ? 's' : ''}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No saved logs found.</p>
                    <button
                      onClick={() => setViewMode('upload')}
                      className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Upload a Log
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Step 2: Log selection for the chosen server
              <div>
                <div className="flex items-center mb-6">
                  <button 
                    onClick={() => setSelectedViewServer(null)}
                    className="mr-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-xl font-bold">Logs from {selectedViewServer}</h2>
                </div>
                
                {isLoadingLogs ? (
                  <div className="p-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                    <p className="mt-4 text-gray-500">Loading logs...</p>
                  </div>
                ) : serverLogs.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {serverLogs.map((log) => (
                      <li key={log.id} className="py-3">
                        <button
                          onClick={() => navigateToLogDetail(log.id)}
                          className="w-full text-left px-4 py-3 rounded hover:bg-purple-100 flex justify-between items-center transition-colors"
                        >
                          <span className="font-medium">
                            {new Date(log.logDate).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No logs found for this server.</p>
                    <button
                      onClick={() => setViewMode('upload')}
                      className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Upload a Log
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
