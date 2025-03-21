import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Common nicknames for NBA players
const PLAYER_NICKNAMES = {
  "2544": "King James",
  "203999": "The Joker",
  "201939": "The Chef",
  "201142": "Durantula",
  "203507": "Greek Freak",
  "1629029": "Luka Magic",
  "203954": "The Process",
  "1628983": "SGA",
  "1628369": "JT",
  "1630162": "Ant-Man",
  "202681": "Spida",
  "203076": "The Brow",
  "1629027": "Time Lord",
  "203081": "Dame D.O.L.L.A.",
  "1627750": "Maple Jordan",
  "1627732": "The Beard"
};

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

export default function PlayerPage() {
  const router = useRouter();
  const { playerId } = router.query;
  
  const [player, setPlayer] = useState(null);
  const [playerBio, setPlayerBio] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  const [careerStats, setCareerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [imageError, setImageError] = useState(false);
  const [liveGame, setLiveGame] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [playerNickname, setPlayerNickname] = useState('');

  const fetchPlayerData = async (forceRefresh = false) => {
    if (!playerId) return;
    
    try {
      if (!forceRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // Fetch player data from our API endpoint
      const queryParam = forceRefresh ? '?force_refresh=true' : '';
      const response = await axios.get(`${API_URL}/players/${playerId}${queryParam}`);
      
      setPlayer(response.data);
      
      // Set player bio if available
      if (response.data.playerBio) {
        setPlayerBio(response.data.playerBio);
        setPlayerNickname(response.data.playerBio.nickname || '');
      }
      
      // Set current stats if available
      if (response.data.currentStats) {
        setCurrentStats(response.data.currentStats);
      }
      
      // Set career stats if available and reorganize to move totals to the end
      if (response.data.careerStats && response.data.careerStats.length > 0) {
        const regularEntries = response.data.careerStats.filter(stat => 
          !stat.is_total && !stat.is_team_total && stat.season !== 'Career'
        );
        
        const teamTotals = response.data.careerStats.filter(stat => 
          stat.is_team_total || (stat.season && stat.season.includes('Total'))
        );
        
        const careerTotals = response.data.careerStats.filter(stat => 
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
        setCareerStats(sortedStats);
      }
      
      setLiveGame(response.data.live_game);
      setLastUpdated(new Date().toISOString());
      
      setLoading(false);
      if (forceRefresh) setRefreshing(false);
    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Failed to load player data. Please try again later.');
      setLoading(false);
      if (forceRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!playerId) return;
    
    const fetchPlayer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/players/${playerId}`);
        
        if (response.data) {
          // Create a properly formatted player object from the API response
          const playerData = {
            id: playerId,
            name: response.data.playerBio?.name || 'NBA Player',
            position: response.data.playerBio?.position || 'N/A',
            team_id: response.data.playerBio?.team_id || null,
            team_name: response.data.playerBio?.team_name || 'N/A',
            height: response.data.playerBio?.height || 'N/A',
            weight: response.data.playerBio?.weight || 'N/A',
            jersey_number: response.data.playerBio?.jersey || 'N/A',
            last_updated: response.data.lastUpdated || new Date().toISOString(),
            career_stats: {
              points: response.data.currentStats?.pts || 0,
              rebounds: response.data.currentStats?.reb || 0,
              assists: response.data.currentStats?.ast || 0,
              steals: response.data.currentStats?.stl || 0,
              blocks: response.data.currentStats?.blk || 0,
              field_goal_percentage: response.data.currentStats?.fg_pct ? response.data.currentStats.fg_pct / 100 : 0,
              three_point_percentage: response.data.currentStats?.fg3_pct ? response.data.currentStats.fg3_pct / 100 : 0,
              free_throw_percentage: response.data.currentStats?.ft_pct ? response.data.currentStats.ft_pct / 100 : 0,
              minutes: response.data.currentStats?.min || 0,
              games_played: response.data.currentStats?.games_played || 0,
              efficiency: 0
            },
            bio: {
              age: response.data.playerBio?.age || null,
              country: response.data.playerBio?.country || 'N/A',
              draft_year: response.data.playerBio?.draft_year || null,
              draft_round: response.data.playerBio?.draft_round || 1,
              draft_pick: response.data.playerBio?.draft_number || null,
              college: response.data.playerBio?.school || 'N/A',
              birthday: response.data.playerBio?.birthdate ? 
                new Date(response.data.playerBio.birthdate).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                }) : 'N/A',
              experience: response.data.playerBio?.season_exp ? 
                `${response.data.playerBio.season_exp} years` : 'Rookie'
            }
          };
          
          setPlayer(playerData);
          setPlayerBio(playerData.bio);
          setCurrentStats(response.data.currentStats);
          setCareerStats(response.data.careerStats || []);
          
          // Set player nickname either from API response or from our local mapping
          if (response.data.playerBio?.nickname) {
            setPlayerNickname(response.data.playerBio.nickname);
          } else if (PLAYER_NICKNAMES[playerId]) {
            setPlayerNickname(PLAYER_NICKNAMES[playerId]);
          } else {
            setPlayerNickname(null);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching player data:', err);
        setError('Failed to load player data. Please try again later.');
        setLoading(false);
        
        // For demo purposes, generate mock data if API fails
        generateMockPlayer(playerId);
      }
    };
    
    fetchPlayer();
  }, [playerId]);

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
    // The API might return percentages as 0-1 or as already multiplied by 100
    const percentValue = value > 1 ? value : value * 100;
    return `${percentValue.toFixed(1)}%`;
  };

  // Prepare chart data for player stats if available
  const statsChart = {
    labels: ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks'],
    datasets: [
      {
        label: player?.name || 'Player Stats',
        data: currentStats ? 
          [currentStats.pts, currentStats.reb, currentStats.ast, currentStats.stl, currentStats.blk] :
          player ? 
            [player.points, player.rebounds, player.assists, player.steals, player.blocks] : 
            [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Season Statistics',
      },
    },
    scales: {
      r: {
        min: 0,
      },
    },
  };

  // Generate mock player data for demo purposes
  const generateMockPlayer = (id) => {
    // Create mock player data
    const mockPlayer = {
      id: id,
      name: id === '2544' ? 'LeBron James' : `Player ${id}`,
      position: 'Forward',
      team_id: 1610612747, // Lakers team id
      team_name: 'Lakers',
      height: '6-9',
      weight: '250',
      jersey_number: 23,
      last_updated: new Date().toISOString(),
      career_stats: {
        points: 27.2,
        rebounds: 7.5,
        assists: 8.3,
        steals: 1.5,
        blocks: 0.8,
        field_goal_percentage: 0.504,
        three_point_percentage: 0.347,
        free_throw_percentage: 0.734,
        minutes: 37.2,
        games_played: 1421,
        efficiency: 29.8
      },
      bio: {
        age: 38,
        country: 'USA',
        draft_year: 2003,
        draft_round: 1,
        draft_pick: 1,
        college: 'St. Vincent-St. Mary HS (OH)',
        birthday: 'December 30, 1984',
        experience: '21 years'
      }
    };
    
    setPlayer(mockPlayer);
    setPlayerBio(mockPlayer.bio);
    setPlayerStats(mockPlayer.career_stats);
    setCurrentStats(mockPlayer.career_stats); // Also set currentStats
    setPlayerNickname(PLAYER_NICKNAMES[id] || 'King James');
    setLoading(false);
  };

  // If still loading, show loading indicator
  if (loading) {
    return (
      <div className="min-h-screen animated-bg">
        <div className="container mx-auto px-4 py-8">
          <header className="flex items-center justify-between mb-8">
            <Link href="/" className="no-underline">
              <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                          bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
                NBASTATS
              </h1>
            </Link>
            <ThemeToggle />
          </header>
          
          <div className="flex items-center justify-center h-96">
            <div className="text-2xl font-futuristic text-neon-blue dark:text-neon-purple animate-pulse flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading player data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="min-h-screen animated-bg">
        <div className="container mx-auto px-4 py-8">
          <header className="flex items-center justify-between mb-8">
            <Link href="/" className="no-underline">
              <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                          bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
                NBASTATS
              </h1>
            </Link>
            <ThemeToggle />
          </header>
          
          <div className="flex items-center justify-center h-96">
            <div className="text-2xl font-futuristic text-red-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // If no player data, show not found message
  if (!player) {
    return (
      <div className="min-h-screen animated-bg">
        <div className="container mx-auto px-4 py-8">
          <header className="flex items-center justify-between mb-8">
            <Link href="/" className="no-underline">
              <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                          bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
                NBASTATS
              </h1>
            </Link>
            <ThemeToggle />
          </header>
          
          <div className="flex items-center justify-center h-96">
            <div className="text-2xl font-futuristic text-yellow-500">Player not found</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen animated-bg">
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
            <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                        bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
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
          {/* Player Header */}
          <div className="relative mb-8 overflow-hidden rounded-2xl bg-white/30 dark:bg-black/30 backdrop-blur-sm shadow-lg">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-500/30 dark:from-blue-600/20 dark:to-purple-800/20"></div>
            
            <div className="relative flex flex-col md:flex-row items-center p-6 md:p-8">
              {/* Player image */}
              <div className="relative w-48 h-48 md:w-56 md:h-56 mb-6 md:mb-0 md:mr-8 overflow-hidden rounded-full border-4 border-white/50 dark:border-gray-800/50 shadow-xl">
                <Image
                  src={imageError ? 
                    '/images/player-placeholder.png' : 
                    `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
                  }
                  alt={player?.name || 'NBA Player'}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
                {/* Player name overlay at bottom of image */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-center">
                  <h3 className="text-white text-sm font-semibold truncate">{player?.name || 'Player'}</h3>
                </div>
              </div>
              
              {/* Player info */}
              <div className="text-center md:text-left">
                <h2 className="text-4xl md:text-5xl font-bold mb-2 text-gray-800 dark:text-white">
                  {player?.name || 'Player'}
                </h2>
                {playerNickname && (
                  <div className="inline-block px-3 py-1 mb-3 rounded-full bg-blue-500/20 dark:bg-blue-500/30 text-blue-800 dark:text-blue-200 text-md md:text-lg font-medium">
                    "{playerNickname}"
                  </div>
                )}
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                  <div className="px-3 py-1 rounded-full bg-blue-500/20 dark:bg-blue-500/30 text-blue-800 dark:text-blue-200 text-sm font-medium">
                    {player?.position || 'N/A'}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-gray-500/20 dark:bg-gray-500/30 text-gray-800 dark:text-gray-200 text-sm font-medium">
                    {player?.height || 'N/A'} • {player?.weight || 'N/A'} lbs
                  </div>
                  {player?.team_id && (
                    <Link href={`/team/${player.team_id}`} className="px-3 py-1 rounded-full bg-purple-500/20 dark:bg-purple-500/30 text-purple-800 dark:text-purple-200 text-sm font-medium hover:bg-purple-500/30 dark:hover:bg-purple-500/40 transition-colors">
                      {player?.team_name || 'Team'}
                    </Link>
                  )}
                  {player?.jersey_number && (
                    <div className="px-3 py-1 rounded-full bg-orange-500/20 dark:bg-orange-500/30 text-orange-800 dark:text-orange-200 text-sm font-medium">
                      #{player?.jersey_number}
                    </div>
                  )}
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
                      Refresh Live Stats
                    </>
                  )}
                </button>
              </div>
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
                {/* Bio Section */}
                <div className="player-bio mb-10">
                  <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Player Bio</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Age</h4>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">{player?.bio?.age || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Country</h4>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">{player?.bio?.country || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">College</h4>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">{player?.bio?.college || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Draft</h4>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {player?.bio?.draft_year ? 
                          `${player.bio.draft_year}: Round ${player.bio.draft_round}, Pick ${player.bio.draft_pick}` : 
                          'Undrafted'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Experience</h4>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">{player?.bio?.experience || 'Rookie'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Birthday</h4>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">{player?.bio?.birthday || '-'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Season Averages */}
                {player?.career_stats && (
                  <div>
                    <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Season Averages</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                      <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatStat(player.career_stats.points)}
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">POINTS</p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatStat(player.career_stats.rebounds)}
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">REBOUNDS</p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatStat(player.career_stats.assists)}
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">ASSISTS</p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatStat(player.career_stats.steals)}
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">STEALS</p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatStat(player.career_stats.blocks)}
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">BLOCKS</p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 p-5 rounded-lg shadow-sm text-center transform transition-all hover:scale-105">
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formatPercentage(player.career_stats.field_goal_percentage)}
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">FG%</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show message when no stats are available */}
                {!player?.career_stats && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400">Current season stats not available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                {currentStats ? (
                  <div>
                    <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      {currentStats.season || 'Current'} Season Stats
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
                          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{formatPercentage(currentStats.fg_pct / 100)}</div>
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
                            <th className="px-4 py-3 text-right">Total</th>
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
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">No current season stats available.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Career History</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="px-2 py-3 text-left">Season</th>
                        <th className="px-2 py-3 text-left">Team</th>
                        <th className="px-2 py-3 text-right">GP</th>
                        <th className="px-2 py-3 text-right">MIN</th>
                        <th className="px-2 py-3 text-right">PTS</th>
                        <th className="px-2 py-3 text-right">REB</th>
                        <th className="px-2 py-3 text-right">AST</th>
                        <th className="px-2 py-3 text-right">STL</th>
                        <th className="px-2 py-3 text-right">BLK</th>
                        <th className="px-2 py-3 text-right">FG%</th>
                        <th className="px-2 py-3 text-right">3P%</th>
                        <th className="px-2 py-3 text-right">FT%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {careerStats.map((season, index) => {
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
                            <td className="px-2 py-3 font-medium">{season.season}</td>
                            <td className="px-2 py-3">{season.team}</td>
                            <td className="px-2 py-3 text-right">{season.games_played}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.min)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.pts)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.reb)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.ast)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.stl)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.blk)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.fg_pct)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.fg3_pct)}</td>
                            <td className="px-2 py-3 text-right">{formatStat(season.ft_pct)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-sm opacity-70">
          <p className="font-serif">© 2025 NBA Stats | Weaver</p>
        </footer>
      </div>
    </div>
  );
} 