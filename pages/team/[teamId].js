import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function TeamPage() {
  const router = useRouter();
  const { teamId } = router.query;
  
  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeamData = async (forceRefresh = false) => {
    if (!teamId) return;

    try {
      if (!forceRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // First fetch team details from the teams endpoint
      const teamsResponse = await axios.get(`${API_URL}/teams`);
      const teamData = teamsResponse.data.find(t => t.id === parseInt(teamId));
      
      if (!teamData) {
        setError('Team not found');
        setLoading(false);
        if (forceRefresh) setRefreshing(false);
        return;
      }
      
      setTeam(teamData);
      
      // Then fetch players for this team with force refresh parameter if needed
      const endpoint = forceRefresh 
        ? `${API_URL}/players/team/${teamId}?force_refresh=true` 
        : `${API_URL}/players/team/${teamId}`;
      
      const playersResponse = await axios.get(endpoint);
      setPlayers(playersResponse.data);
      
      setLoading(false);
      if (forceRefresh) setRefreshing(false);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data. Please try again later.');
      setLoading(false);
      if (forceRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only fetch when we have a teamId (after hydration)
    if (!teamId) return;
    fetchTeamData();
  }, [teamId]);

  // Function to handle refreshing team data
  const handleRefreshData = () => {
    fetchTeamData(true);
  };

  // Function to handle missing player images
  const handleImageError = (e) => {
    e.target.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/logoman.png';
  };

  // Filter players based on search query
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort players by name instead of jersey number
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen animated-bg">
      <Head>
        <title>
          {team ? `${team.full_name} | NBA Stats Tracker` : 'Team | NBA Stats Tracker'}
        </title>
        <meta 
          name="description" 
          content={team ? `Statistics for ${team.full_name} players` : 'NBA team statistics'} 
        />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <Link href="/" className="no-underline">
            <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                        bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
              NBASTATS
            </h1>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-2 pl-10 pr-4 w-48 md:w-64 rounded-full bg-white/10 dark:bg-black/30 
                         border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 
                         focus:ring-neon-blue dark:focus:ring-neon-purple"
              />
              <span className="absolute inset-y-0 left-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
            
            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-futuristic text-neon-blue dark:text-neon-purple animate-pulse">
                Loading team data...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-futuristic text-red-500">{error}</div>
            </div>
          ) : (
            <>
              {/* Team Header with Logo */}
              <div className="flex flex-col md:flex-row items-center justify-between mb-12">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 md:mb-0 md:mr-8">
                    <Image
                      src={`https://cdn.nba.com/logos/nba/${team.id}/primary/L/logo.svg`}
                      alt={team.full_name}
                      fill
                      className="object-contain"
                      onError={(e) => {
                        e.target.src = 'https://cdn.nba.com/logos/nba/fallback.png';
                      }}
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl md:text-5xl font-bold mb-2 text-gray-800 dark:text-white">
                      {team.full_name}
                    </h2>
                    <p className="text-lg opacity-80">
                      {team.city}, {team.state} • Est. {team.year_founded}
                    </p>
                  </div>
                </div>
                
                {/* Refresh button */}
                <button 
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className="mt-4 md:mt-0 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing Team Data...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Refresh Team Data
                    </>
                  )}
                </button>
              </div>

              {/* Players Grid */}
              <h3 className="text-2xl font-bold mb-8 text-center text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Players
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPlayers.map((player) => (
                  <Link href={`/player/${player.id}`} key={player.id} className="no-underline">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transform transition-all hover:scale-105">
                      <div className="relative">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <Image
                            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                            alt={player.name}
                            width={300}
                            height={300}
                            className="object-cover w-full h-full"
                            onError={handleImageError}
                          />
                        </div>
                        
                        {/* Jersey Number Badge removed */}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-white">{player.name}</h3>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{player.position}</p>
                          <div className="px-2 py-1 text-xs rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {player.height} • {player.weight}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {sortedPlayers.length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-xl font-futuristic">No players found for this team.</p>
                  </div>
                )}
              </div>
              
              {/* Back Button */}
              <div className="mt-12 text-center">
                <Link href="/" className="nba-btn-primary inline-block">
                  Back to Teams
                </Link>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-sm opacity-70">
          <p>© {new Date().getFullYear()} NBA Stats Tracker | Futuristic Design</p>
        </footer>
      </div>
    </div>
  );
} 