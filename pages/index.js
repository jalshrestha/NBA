import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../components/ThemeToggle';
import Standings from '../components/Standings';
import axios from 'axios';
import { FaTrophy } from 'react-icons/fa';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStandings, setShowStandings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const [statusInfo, setStatusInfo] = useState({
    lastUpdated: null,
    hasLiveGames: false
  });
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPlayerResults, setShowPlayerResults] = useState(false);

  useEffect(() => {
    // Fetch teams from API
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/teams`);
        setTeams(response.data);
        
        // Also fetch API status for update info
        try {
          const statusResponse = await axios.get(`${API_URL}/status`);
          setStatusInfo({
            lastUpdated: statusResponse.data.last_updated,
            hasLiveGames: statusResponse.data.has_live_games
          });
        } catch (statusErr) {
          console.warn('Could not fetch API status:', statusErr);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams. Please try again later.');
        setLoading(false);
      }
    };

    fetchTeams();
    
    // Set up polling for updates
    const intervalId = setInterval(() => {
      fetchTeams();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(intervalId);
  }, []);

  // Search players when query changes
  useEffect(() => {
    const searchPlayers = async () => {
      if (playerSearchQuery.length < 2) {
        setPlayerSearchResults([]);
        setShowPlayerResults(false);
        return;
      }
      
      setIsSearching(true);
      try {
        const response = await axios.get(`${API_URL}/players/search?q=${encodeURIComponent(playerSearchQuery)}`);
        setPlayerSearchResults(response.data);
        setShowPlayerResults(true);
      } catch (error) {
        console.error('Error searching players:', error);
        setPlayerSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchPlayers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [playerSearchQuery]);

  // Filter teams based on search query
  const filteredTeams = teams.filter(team => 
    team.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle image loading errors
  const handleImageError = (teamId) => {
    setImageErrors(prev => ({
      ...prev,
      [teamId]: true
    }));
  };

  return (
    <div className="min-h-screen animated-bg">
      <Head>
        <title>NBA Stats Tracker | Futuristic NBA Statistics</title>
        <meta name="description" content="A futuristic NBA statistics tracker app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-6">
            <Link href="/" className="no-underline">
              <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                          bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
                NBASTATS
              </h1>
            </Link>
            
            {/* Standings Button - Moved here */}
            <button
              onClick={() => setShowStandings(!showStandings)}
              className="px-4 py-2 text-sm font-medium rounded-full 
                       bg-white/10 border border-gray-300 dark:border-gray-700
                       text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-black/30
                       transition-colors duration-200 focus:outline-none focus:ring-2 
                       focus:ring-neon-blue dark:focus:ring-neon-purple"
            >
              {showStandings ? 'Hide Standings' : 'Show Standings'}
            </button>
            
            {/* STATS Button */}
            <Link
              href="/stats"
              className="px-5 py-2 mr-2 text-sm font-bold rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transform transition hover:scale-105 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              STATS
            </Link>
          </div>

          <div className="relative">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  className="py-2 pl-10 pr-4 md:w-64 rounded-full bg-white/10 dark:bg-black/30 
                           border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 
                           focus:ring-neon-blue dark:focus:ring-neon-purple"
                />
                <span className="absolute inset-y-0 left-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
              <ThemeToggle className="ml-4" />
            </div>

            {/* Player search results dropdown */}
            {showPlayerResults && playerSearchResults.length > 0 && (
              <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg z-50 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <div className="animate-pulse text-gray-600 dark:text-gray-400">Searching...</div>
                  </div>
                ) : (
                  <ul>
                    {playerSearchResults.map(player => (
                      <li key={player.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <Link 
                          href={`/player/${player.id}`}
                          className="block p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                          onClick={() => {
                            setShowPlayerResults(false);
                            setPlayerSearchQuery('');
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">{player.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {player.position} • {player.team_name}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main content with optional standings sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Teams Grid */}
          <main className={`${showStandings ? 'lg:w-2/3' : 'w-full'}`}>
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-2xl font-futuristic text-neon-blue dark:text-neon-purple animate-pulse">
                  Loading teams...
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-2xl font-futuristic text-red-500">{error}</div>
              </div>
            ) : (
              <>
                {/* Status Badge */}
                <div className="mb-6 flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Last updated: {statusInfo.lastUpdated ? new Date(statusInfo.lastUpdated).toLocaleString() : 'Unknown'}
                  </div>
                  
                  {statusInfo.hasLiveGames && (
                    <div className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-medium animate-pulse">
                      <span className="inline-block w-2 h-2 rounded-full bg-white mr-1"></span>
                      LIVE GAMES
                    </div>
                  )}
                </div>
              
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredTeams.map((team) => (
                    <Link href={`/team/${team.id}`} key={team.id} className="no-underline">
                      <div className="team-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 flex flex-col items-center hover:shadow-xl transition-shadow duration-300 cursor-pointer">
                        <div className="relative w-24 h-24 mb-4">
                          <Image
                            src={imageErrors[team.id] ? 
                              '/images/fallback-logo.png' : 
                              `https://cdn.nba.com/logos/nba/${team.id}/primary/L/logo.svg`
                            }
                            alt={team.name}
                            fill
                            className="object-contain"
                            onError={() => handleImageError(team.id)}
                          />
                        </div>
                        <h3 className="text-sm md:text-base font-futuristic text-center text-gray-800 dark:text-white">
                          {team.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {team.wins}-{team.losses}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                
                {filteredTeams.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      No teams match your search criteria
                    </p>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Standings Sidebar (visible when showStandings is true) */}
          {showStandings && (
            <aside className="lg:w-1/3 flex-shrink-0">
              <Standings />
            </aside>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center">
          <p className="font-serif" style={{ fontFamily: "'Weaver', serif" }}>2025 NBA Stats | Weaver</p>
        </footer>
      </div>
    </div>
  );
} 