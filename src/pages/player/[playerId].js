import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

export default function PlayerPage() {
  const router = useRouter();
  const { playerId } = router.query;
  
  const [player, setPlayer] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  const [historicalStats, setHistoricalStats] = useState([]);
  const [playerBio, setPlayerBio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [wikiInfo, setWikiInfo] = useState('');
  const [imageError, setImageError] = useState(false);
  const [playerImage, setPlayerImage] = useState('');
  const [teamImage, setTeamImage] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const [liveGame, setLiveGame] = useState(false);
  const [playerNickname, setPlayerNickname] = useState('');

  const fetchPlayerData = async (forceRefresh = false) => {
    if (!playerId) return;
    
    setLoading(true);
    setRefreshing(forceRefresh);
    
    try {
      // Add timestamp and query parameters for force refresh and recompute
      const timestamp = new Date().getTime();
      const endpoint = `/api/player/${playerId}/stats?force_refresh=${forceRefresh}&recompute=${forceRefresh}&t=${timestamp}`;
      
      console.log(`Fetching player data from ${endpoint}`);
      const response = await axios.get(endpoint);
      
      if (response.status === 200) {
        const data = response.data;
        
        if (data && data.playerBio) {
          setPlayerBio(data.playerBio);
          setCurrentStats(data.currentStats || null);
          
          // Reorganize career stats to move totals to the end
          if (data.careerStats && data.careerStats.length > 0) {
            const regularEntries = data.careerStats.filter(stat => 
              !stat.is_total && !stat.is_team_total && stat.season !== 'Career'
            );
            
            const teamTotals = data.careerStats.filter(stat => 
              stat.is_team_total || (stat.season && stat.season.includes('Total'))
            );
            
            const careerTotals = data.careerStats.filter(stat => 
              stat.season === 'Career' || stat.is_total
            );
            
            // Sort regular entries by season in descending order
            regularEntries.sort((a, b) => {
              // Extract years from season strings like "2022-23"
              const yearA = parseInt(a.season.split('-')[0]);
              const yearB = parseInt(b.season.split('-')[0]);
              return yearB - yearA; // Descending order
            });
            
            // Combine in the desired order: regular entries, then team totals, then career total
            const sortedStats = [...regularEntries, ...teamTotals, ...careerTotals];
            setHistoricalStats(sortedStats);
          } else {
            setHistoricalStats(data.careerStats || []);
          }
          
          setPlayerImage(`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`);
          setTeamImage(`https://cdn.nba.com/logos/nba/${data.playerBio.team_id}/primary/L/logo.svg`);
          
          // Set jersey number from bio data
          setJerseyNumber(data.playerBio.jersey || "00");
          
          // Set team name from bio data
          setTeamName(data.playerBio.team_name || data.playerBio.team_abbreviation || "");
          
          // Set player nickname if available
          setPlayerNickname(data.playerBio.nickname || "");
          
          console.log("Player data fetched successfully:", data);
        } else {
          console.error("Invalid player data format:", data);
          setError("Invalid player data format");
        }
      } else {
        console.error("Failed to fetch player data:", response);
        setError("Failed to fetch player data");
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
      setError("Error fetching player data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only fetch when we have a playerId (after hydration)
    if (!playerId) return;
    fetchPlayerData();
  }, [playerId]);

  // Check if stats are missing and try to fetch with force_refresh
  useEffect(() => {
    // If stats are missing, try to fetch stats with force_refresh=true
    if (player && (!currentStats || (historicalStats && historicalStats.length === 0))) {
      // Wait a bit to avoid too many rapid requests
      const timer = setTimeout(() => {
        console.log("Stats missing, fetching with force_refresh");
        fetchPlayerData(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [player, currentStats, historicalStats]);

  // Function to handle refreshing player data
  const handleRefreshData = () => {
    fetchPlayerData(true);
  };

  // Function to handle missing player images
  const handleImageError = () => {
    setImageError(true);
  };

  // Function to format stat values
  const formatStat = (value) => {
    if (value === undefined || value === null) return '-';
    return parseFloat(value).toFixed(1);
  };

  // Function to format percentage values
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return '-';
    const numValue = parseFloat(value);
    // The value is already a percentage (0-100), just format it
    return `${numValue.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-900 dark:to-blue-900 animate-gradient-shift">
      <Head>
        <title>
          {player ? `${player.name} | NBA Stats Tracker` : 'Player | NBA Stats Tracker'}
        </title>
        <meta 
          name="description" 
          content={player ? `Statistics for ${player.name}` : 'NBA player statistics'} 
        />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="no-underline">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider bg-clip-text text-transparent 
                        bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse-slow">
              NBASTATS
            </h1>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl text-blue-500 dark:text-blue-400 animate-pulse flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading player data...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl text-red-500">{error}</div>
            </div>
          ) : (
            <>
              {/* Player Header */}
              <div className="relative flex flex-col md:flex-row items-center p-6 md:p-8">
                {/* Player image */}
                <div className="relative w-48 h-48 md:w-56 md:h-56 mb-6 md:mb-0 md:mr-8 overflow-hidden rounded-full border-4 border-white/50 dark:border-gray-800/50 shadow-xl">
                  <Image
                    src={imageError ? 
                      '/images/player-placeholder.png' : 
                      `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
                    }
                    alt={playerBio?.name || 'Player'}
                    fill
                    className="object-cover"
                    onError={handleImageError}
                  />
                  {/* Player name overlay at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-center">
                    <h3 className="text-white text-sm font-semibold truncate">{playerBio?.name || 'Player'}</h3>
                  </div>
                </div>
                
                {/* Player info */}
                <div className="text-center md:text-left">
                  <h2 className="text-4xl md:text-5xl font-bold mb-2 text-gray-800 dark:text-white">
                    {playerBio?.name || 'Player'}
                    {playerNickname && (
                      <span className="text-lg md:text-2xl ml-2 text-gray-500 dark:text-gray-400">
                        ("{playerNickname}")
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                    <div className="px-3 py-1 rounded-full bg-blue-500/20 dark:bg-blue-500/30 text-blue-800 dark:text-blue-200 text-sm font-medium">
                      {playerBio?.position || player?.position || 'N/A'}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-gray-500/20 dark:bg-gray-500/30 text-gray-800 dark:text-gray-200 text-sm font-medium">
                      {playerBio?.height || player?.height || 'N/A'} • {playerBio?.weight || player?.weight || 'N/A'} lbs
                    </div>
                    <Link href={`/team/${playerBio?.team_id || player?.team_id}`} className="px-3 py-1 rounded-full bg-purple-500/20 dark:bg-purple-500/30 text-purple-800 dark:text-purple-200 text-sm font-medium hover:bg-purple-500/30 dark:hover:bg-purple-500/40 transition-colors">
                      {playerBio?.team_name || player?.team_name || 'Team'}
                    </Link>
                  </div>
                  
                  {/* Live Game Badge */}
                  {liveGame && (
                    <div className="mb-3">
                      <span className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-medium animate-pulse">
                        <span className="inline-block w-2 h-2 rounded-full bg-white mr-1"></span>
                        LIVE GAME
                      </span>
                    </div>
                  )}
                  
                  {/* Refresh button */}
                  <button 
                    onClick={handleRefreshData}
                    disabled={refreshing}
                    className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refreshing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Refreshing Stats...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        {(!currentStats || (historicalStats && historicalStats.length === 0)) ? 
                          "Load Player Stats" : 
                          "Refresh Live Stats"
                        }
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 font-medium text-base transition-colors ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-6 py-3 font-medium text-base transition-colors ${
                    activeTab === 'stats'
                      ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Current Season
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 font-medium text-base transition-colors ${
                    activeTab === 'history'
                      ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Career History
                </button>
              </div>

              {/* Tab Content */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Player Bio</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Age</h4>
                          <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            {playerBio?.age || '25'}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Country</h4>
                          <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            {playerBio?.country || 'USA'}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">College</h4>
                          <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            {playerBio?.school || 'Not available'}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Draft</h4>
                          <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            {playerBio?.draft_year ? 
                              `${playerBio.draft_year} • Round ${playerBio.draft_round || '1'} • Pick ${playerBio.draft_number || '1'}` : 
                              'Undrafted'
                            }
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Experience</h4>
                          <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            {playerBio?.season_exp ? 
                              `${playerBio.season_exp} ${parseInt(playerBio.season_exp) === 1 ? 'year' : 'years'}` : 
                              'Rookie'
                            }
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Birthday</h4>
                          <p className="text-xl font-semibold text-gray-800 dark:text-white">
                            {playerBio?.birthdate || 'Not available'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {currentStats && (
                      <div>
                        <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Season Averages</h3>
                        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                          <span>Stats are per-game averages for {currentStats.season} ({currentStats.games_played} games played)</span>
                          <span>Team: {currentStats.team}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                          <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {formatStat(currentStats.pts)}
                            </p>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">POINTS</p>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {formatStat(currentStats.reb)}
                            </p>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">REBOUNDS</p>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {formatStat(currentStats.ast)}
                            </p>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">ASSISTS</p>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {formatStat(currentStats.stl)}
                            </p>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">STEALS</p>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {formatStat(currentStats.blk)}
                            </p>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">BLOCKS</p>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {formatPercentage(currentStats.fg_pct)}
                            </p>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">FG%</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Advanced stats section */}
                    {currentStats && (
                      <div>
                        <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Advanced Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">Games Played</div>
                            <div className="text-2xl font-semibold mt-1">{currentStats.games_played || '-'}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">Minutes</div>
                            <div className="text-2xl font-semibold mt-1">{formatStat(currentStats.min)}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">3PT%</div>
                            <div className="text-2xl font-semibold mt-1">{formatPercentage(currentStats.fg3_pct)}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">FT%</div>
                            <div className="text-2xl font-semibold mt-1">{formatPercentage(currentStats.ft_pct)}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">FG Made-Att</div>
                            <div className="text-2xl font-semibold mt-1">{formatStat(currentStats.fg_m)}-{formatStat(currentStats.fg_a)}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">3PT Made-Att</div>
                            <div className="text-2xl font-semibold mt-1">{formatStat(currentStats.fg3_m)}-{formatStat(currentStats.fg3_a)}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">Off. Rating</div>
                            <div className="text-2xl font-semibold mt-1">{formatStat(currentStats.off_rating)}</div>
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">Def. Rating</div>
                            <div className="text-2xl font-semibold mt-1">{formatStat(currentStats.def_rating)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'stats' && currentStats && (
                  <div>
                    <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      {currentStats.season} Season Stats
                    </h3>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900 p-6 rounded-xl shadow-md mb-6">
                      <div className="mb-4">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex justify-between">
                          <span>Per Game Averages</span>
                          <span>Games Played: {currentStats.games_played || 0}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{formatStat(currentStats.pts)}</div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">PPG</div>
                        </div>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{formatStat(currentStats.reb)}</div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">RPG</div>
                        </div>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{formatStat(currentStats.ast)}</div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">APG</div>
                        </div>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{formatPercentage(currentStats.fg_pct)}</div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">FG%</div>
                        </div>
                      </div>

                      {currentStats.totals && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-3">Season Totals</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Total Points:</span> {currentStats.totals.total_points}
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Total Rebounds:</span> {currentStats.totals.total_rebounds}
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Total Assists:</span> {currentStats.totals.total_assists}
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Minutes Played:</span> {currentStats.totals.total_minutes}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="px-4 py-3 text-left">Category</th>
                            <th className="px-4 py-3 text-right">Value</th>
                            <th className="px-4 py-3 text-right">Per Game</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">Games</td>
                            <td className="px-4 py-3 text-right">{currentStats.games_played}</td>
                            <td className="px-4 py-3 text-right">-</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <td className="px-4 py-3 font-medium">Minutes</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.min * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.min)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">Points</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.pts * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.pts)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <td className="px-4 py-3 font-medium">Field Goals</td>
                            <td className="px-4 py-3 text-right">{currentStats.fg_m ? `${formatStat(currentStats.fg_m * currentStats.games_played)}-${formatStat(currentStats.fg_a * currentStats.games_played)}` : '-'}</td>
                            <td className="px-4 py-3 text-right">{currentStats.fg_m ? `${formatStat(currentStats.fg_m)}-${formatStat(currentStats.fg_a)} (${formatPercentage(currentStats.fg_pct)})` : '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">3-Point FG</td>
                            <td className="px-4 py-3 text-right">{currentStats.fg3_m ? `${formatStat(currentStats.fg3_m * currentStats.games_played)}-${formatStat(currentStats.fg3_a * currentStats.games_played)}` : '-'}</td>
                            <td className="px-4 py-3 text-right">{currentStats.fg3_m ? `${formatStat(currentStats.fg3_m)}-${formatStat(currentStats.fg3_a)} (${formatPercentage(currentStats.fg3_pct)})` : '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <td className="px-4 py-3 font-medium">Free Throws</td>
                            <td className="px-4 py-3 text-right">{currentStats.ft_m ? `${formatStat(currentStats.ft_m * currentStats.games_played)}-${formatStat(currentStats.ft_a * currentStats.games_played)}` : '-'}</td>
                            <td className="px-4 py-3 text-right">{currentStats.ft_m ? `${formatStat(currentStats.ft_m)}-${formatStat(currentStats.ft_a)} (${formatPercentage(currentStats.ft_pct)})` : '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">Offensive Rebounds</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.oreb * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.oreb)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <td className="px-4 py-3 font-medium">Defensive Rebounds</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.dreb * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.dreb)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">Total Rebounds</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.reb * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.reb)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <td className="px-4 py-3 font-medium">Assists</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.ast * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.ast)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">Turnovers</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.turnover * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.turnover)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <td className="px-4 py-3 font-medium">Steals</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.stl * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.stl)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium">Blocks</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.blk * currentStats.games_played)}</td>
                            <td className="px-4 py-3 text-right">{formatStat(currentStats.blk)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Career History</h3>
                    
                    {historicalStats && historicalStats.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              <th className="px-4 py-3 text-left">Season</th>
                              <th className="px-4 py-3 text-left">Team</th>
                              <th className="px-4 py-3 text-right">GP</th>
                              <th className="px-4 py-3 text-right">MIN</th>
                              <th className="px-4 py-3 text-right">PTS</th>
                              <th className="px-4 py-3 text-right">REB</th>
                              <th className="px-4 py-3 text-right">AST</th>
                              <th className="px-4 py-3 text-right">STL</th>
                              <th className="px-4 py-3 text-right">BLK</th>
                              <th className="px-4 py-3 text-right">FG%</th>
                              <th className="px-4 py-3 text-right">3P%</th>
                              <th className="px-4 py-3 text-right">FT%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historicalStats.map((season, index) => {
                              // Determine if this is a total row
                              const isTotal = season.is_total || season.is_team_total || season.season === 'Career' || (season.season && season.season.includes('Total'));
                              
                              return (
                                <tr 
                                  key={index} 
                                  className={`border-b border-gray-200 dark:border-gray-700 ${
                                    isTotal ? 'bg-blue-50 dark:bg-blue-900/30 font-medium' : 
                                    index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 font-medium">{season.season}</td>
                                  <td className="px-4 py-3">{season.team}</td>
                                  <td className="px-4 py-3 text-right">{season.games_played}</td>
                                  <td className="px-4 py-3 text-right">{formatStat(season.min)}</td>
                                  <td className="px-4 py-3 text-right">{formatStat(season.pts)}</td>
                                  <td className="px-4 py-3 text-right">{formatStat(season.reb)}</td>
                                  <td className="px-4 py-3 text-right">{formatStat(season.ast)}</td>
                                  <td className="px-4 py-3 text-right">{formatStat(season.stl)}</td>
                                  <td className="px-4 py-3 text-right">{formatStat(season.blk)}</td>
                                  <td className="px-4 py-3 text-right">{formatPercentage(season.fg_pct)}</td>
                                  <td className="px-4 py-3 text-right">{formatPercentage(season.fg3_pct)}</td>
                                  <td className="px-4 py-3 text-right">{formatPercentage(season.ft_pct)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">
                          No career history available. 
                          <button 
                            onClick={handleRefreshData} 
                            className="ml-2 text-blue-500 hover:text-blue-700 underline"
                          >
                            {refreshing ? 'Refreshing...' : 'Refresh Data'}
                          </button>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!currentStats && !refreshing && (
                  <div className="text-center py-8 my-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-3">
                      No player statistics are available at this time.
                    </p>
                    <button 
                      onClick={handleRefreshData}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-md font-medium flex items-center transition-colors mx-auto"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Load Latest Player Statistics
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-sm opacity-70">
          <p>© {new Date().getFullYear()} NBA Stats Tracker | Premium Design</p>
        </footer>
      </div>
    </div>
  );
} 