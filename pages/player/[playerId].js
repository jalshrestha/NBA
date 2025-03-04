import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

export default function PlayerPage() {
  const router = useRouter();
  const { playerId } = router.query;
  
  const [player, setPlayer] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  const [historicalStats, setHistoricalStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [wikiInfo, setWikiInfo] = useState('');

  useEffect(() => {
    // Only fetch when we have a playerId (after hydration)
    if (!playerId) return;

    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        
        // Fetch player data from our backend API
        const playerResponse = await axios.get(`http://localhost:5001/api/players`);
        const players = playerResponse.data;
        const playerData = players.find(p => p.id === parseInt(playerId));
        
        if (playerData) {
          setPlayer({
            id: playerId,
            name: playerData.name,
            position: playerData.position,
            height: playerData.height,
            weight: playerData.weight,
            jersey_number: playerData.jersey_number,
            team_id: playerData.team_id,
            team_name: playerData.team_name
          });
          
          // Fetch player stats
          const statsResponse = await axios.get(`http://localhost:5001/api/player/${playerId}/stats`);
          const statsData = statsResponse.data;
          
          if (statsData && statsData.current_season_stats) {
            setCurrentStats(statsData.current_season_stats);
            setHistoricalStats(statsData.career_stats || []);
          }
        } else {
          setError('Player not found');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching player data:', err);
        setError('Failed to load player data. Please try again later.');
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId]);

  // Function to handle missing player images
  const handleImageError = (e) => {
    e.target.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/logoman.png';
  };

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
                Loading player data...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-futuristic text-red-500">{error}</div>
            </div>
          ) : (
            <>
              {/* Player Header */}
              <div className="flex flex-col md:flex-row items-center justify-center mb-12">
                <div className="relative w-40 h-40 md:w-56 md:h-56 mb-4 md:mb-0 md:mr-8 overflow-hidden rounded-full border-4 border-neon-blue dark:border-neon-purple">
                  <Image
                    src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                    alt={player.name}
                    fill
                    className="object-cover"
                    onError={handleImageError}
                  />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-futuristic font-bold mb-2">
                    {player.name}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
                    <div className="px-3 py-1 rounded-full bg-white/20 dark:bg-black/30 text-sm">
                      #{player.jersey_number} | {player.position}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/20 dark:bg-black/30 text-sm">
                      {player.height} • {player.weight}
                    </div>
                    <Link href={`/team/${player.team_id}`} className="px-3 py-1 rounded-full bg-neon-blue/20 dark:bg-neon-purple/30 text-sm hover:bg-neon-blue/40 dark:hover:bg-neon-purple/50 transition-colors">
                      {player.team_name}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 font-medium text-sm md:text-base transition-colors ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-neon-blue dark:border-neon-purple text-neon-blue dark:text-neon-purple'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-4 py-2 font-medium text-sm md:text-base transition-colors ${
                    activeTab === 'stats'
                      ? 'border-b-2 border-neon-blue dark:border-neon-purple text-neon-blue dark:text-neon-purple'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Current Season
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 font-medium text-sm md:text-base transition-colors ${
                    activeTab === 'history'
                      ? 'border-b-2 border-neon-blue dark:border-neon-purple text-neon-blue dark:text-neon-purple'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Career History
                </button>
              </div>

              {/* Tab Content */}
              <div className="bg-white/5 dark:bg-black/20 backdrop-blur-sm rounded-xl p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-futuristic font-bold mb-4">Player Bio</h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {wikiInfo}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Age</h4>
                        <p className="text-xl font-semibold">{player.age}</p>
                      </div>
                      <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Country</h4>
                        <p className="text-xl font-semibold">{player.country}</p>
                      </div>
                      <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">College</h4>
                        <p className="text-xl font-semibold">{player.college}</p>
                      </div>
                      <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Draft</h4>
                        <p className="text-xl font-semibold">
                          {player.draft_year} • Round {player.draft_round} • Pick {player.draft_number}
                        </p>
                      </div>
                    </div>
                    
                    {currentStats && (
                      <div>
                        <h3 className="text-2xl font-futuristic font-bold mb-4">Season Averages</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-neon-blue dark:text-neon-purple">
                              {currentStats.pts ? currentStats.pts.toFixed(1) : '-'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">PTS</p>
                          </div>
                          <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-neon-blue dark:text-neon-purple">
                              {currentStats.reb ? currentStats.reb.toFixed(1) : '-'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">REB</p>
                          </div>
                          <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-neon-blue dark:text-neon-purple">
                              {currentStats.ast ? currentStats.ast.toFixed(1) : '-'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">AST</p>
                          </div>
                          <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-neon-blue dark:text-neon-purple">
                              {currentStats.stl ? currentStats.stl.toFixed(1) : '-'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">STL</p>
                          </div>
                          <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-neon-blue dark:text-neon-purple">
                              {currentStats.blk ? currentStats.blk.toFixed(1) : '-'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">BLK</p>
                          </div>
                          <div className="bg-white/10 dark:bg-black/30 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-neon-blue dark:text-neon-purple">
                              {currentStats.fg_pct ? (currentStats.fg_pct * 100).toFixed(1) : '-'}%
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">FG%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'stats' && currentStats && (
                  <div>
                    <h3 className="text-2xl font-futuristic font-bold mb-4">
                      {currentStats.season || 'Current'} Season Statistics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-white/10 dark:bg-black/30">
                            <th className="px-4 py-2 font-medium">GP</th>
                            <th className="px-4 py-2 font-medium">MIN</th>
                            <th className="px-4 py-2 font-medium">PTS</th>
                            <th className="px-4 py-2 font-medium">REB</th>
                            <th className="px-4 py-2 font-medium">AST</th>
                            <th className="px-4 py-2 font-medium">STL</th>
                            <th className="px-4 py-2 font-medium">BLK</th>
                            <th className="px-4 py-2 font-medium">FG%</th>
                            <th className="px-4 py-2 font-medium">3P%</th>
                            <th className="px-4 py-2 font-medium">FT%</th>
                            <th className="px-4 py-2 font-medium">TO</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3">{currentStats.games_played || '-'}</td>
                            <td className="px-4 py-3">{currentStats.min ? currentStats.min.toFixed(1) : '-'}</td>
                            <td className="px-4 py-3 font-bold">{currentStats.pts ? currentStats.pts.toFixed(1) : '-'}</td>
                            <td className="px-4 py-3">{currentStats.reb ? currentStats.reb.toFixed(1) : '-'}</td>
                            <td className="px-4 py-3">{currentStats.ast ? currentStats.ast.toFixed(1) : '-'}</td>
                            <td className="px-4 py-3">{currentStats.stl ? currentStats.stl.toFixed(1) : '-'}</td>
                            <td className="px-4 py-3">{currentStats.blk ? currentStats.blk.toFixed(1) : '-'}</td>
                            <td className="px-4 py-3">{currentStats.fg_pct ? (currentStats.fg_pct * 100).toFixed(1) : '-'}%</td>
                            <td className="px-4 py-3">{currentStats.fg3_pct ? (currentStats.fg3_pct * 100).toFixed(1) : '-'}%</td>
                            <td className="px-4 py-3">{currentStats.ft_pct ? (currentStats.ft_pct * 100).toFixed(1) : '-'}%</td>
                            <td className="px-4 py-3">{currentStats.turnover ? currentStats.turnover.toFixed(1) : '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {currentStats && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div className="bg-white/10 dark:bg-black/30 p-6 rounded-lg">
                          <h4 className="text-xl font-futuristic font-bold mb-4">Advanced Stats</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Off Rating</p>
                              <p className="text-2xl font-bold">
                                {currentStats.off_rating ? currentStats.off_rating.toFixed(1) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Def Rating</p>
                              <p className="text-2xl font-bold">
                                {currentStats.def_rating ? currentStats.def_rating.toFixed(1) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Games Started</p>
                              <p className="text-2xl font-bold">{currentStats.games_started || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Net Rating</p>
                              <p className="text-2xl font-bold">
                                {currentStats.off_rating && currentStats.def_rating 
                                  ? (currentStats.off_rating - currentStats.def_rating).toFixed(1) 
                                  : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white/10 dark:bg-black/30 p-6 rounded-lg">
                          <h4 className="text-xl font-futuristic font-bold mb-4">Shooting Splits</h4>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Field Goal %</span>
                                <span>{currentStats.fg_pct ? (currentStats.fg_pct * 100).toFixed(1) : '-'}%</span>
                              </div>
                              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-neon-blue dark:bg-neon-purple h-2 rounded-full" 
                                  style={{ width: `${currentStats.fg_pct ? currentStats.fg_pct * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span>3-Point %</span>
                                <span>{currentStats.fg3_pct ? (currentStats.fg3_pct * 100).toFixed(1) : '-'}%</span>
                              </div>
                              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-neon-blue dark:bg-neon-purple h-2 rounded-full" 
                                  style={{ width: `${currentStats.fg3_pct ? currentStats.fg3_pct * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Free Throw %</span>
                                <span>{currentStats.ft_pct ? (currentStats.ft_pct * 100).toFixed(1) : '-'}%</span>
                              </div>
                              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-neon-blue dark:bg-neon-purple h-2 rounded-full" 
                                  style={{ width: `${currentStats.ft_pct ? currentStats.ft_pct * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <h3 className="text-2xl font-futuristic font-bold mb-4">Career Statistics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-white/10 dark:bg-black/30">
                            <th className="px-4 py-2 font-medium">Season</th>
                            <th className="px-4 py-2 font-medium">Team</th>
                            <th className="px-4 py-2 font-medium">GP</th>
                            <th className="px-4 py-2 font-medium">MIN</th>
                            <th className="px-4 py-2 font-medium">PTS</th>
                            <th className="px-4 py-2 font-medium">REB</th>
                            <th className="px-4 py-2 font-medium">AST</th>
                            <th className="px-4 py-2 font-medium">STL</th>
                            <th className="px-4 py-2 font-medium">BLK</th>
                            <th className="px-4 py-2 font-medium">FG%</th>
                            <th className="px-4 py-2 font-medium">3P%</th>
                            <th className="px-4 py-2 font-medium">FT%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentStats && (
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-white/5 dark:bg-white/5">
                              <td className="px-4 py-3">{currentStats.season || '-'}</td>
                              <td className="px-4 py-3">{player.team_name}</td>
                              <td className="px-4 py-3">{currentStats.games_played || '-'}</td>
                              <td className="px-4 py-3">{currentStats.min ? currentStats.min.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3 font-bold">{currentStats.pts ? currentStats.pts.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{currentStats.reb ? currentStats.reb.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{currentStats.ast ? currentStats.ast.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{currentStats.stl ? currentStats.stl.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{currentStats.blk ? currentStats.blk.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{currentStats.fg_pct ? (currentStats.fg_pct * 100).toFixed(1) : '-'}%</td>
                              <td className="px-4 py-3">{currentStats.fg3_pct ? (currentStats.fg3_pct * 100).toFixed(1) : '-'}%</td>
                              <td className="px-4 py-3">{currentStats.ft_pct ? (currentStats.ft_pct * 100).toFixed(1) : '-'}%</td>
                            </tr>
                          )}
                          
                          {historicalStats.map((season, index) => (
                            <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                              <td className="px-4 py-3">{season.season || '-'}</td>
                              <td className="px-4 py-3">{season.team || '-'}</td>
                              <td className="px-4 py-3">{season.games_played || '-'}</td>
                              <td className="px-4 py-3">{season.min ? season.min.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3 font-bold">{season.pts ? season.pts.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{season.reb ? season.reb.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{season.ast ? season.ast.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{season.stl ? season.stl.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{season.blk ? season.blk.toFixed(1) : '-'}</td>
                              <td className="px-4 py-3">{season.fg_pct ? (season.fg_pct * 100).toFixed(1) : '-'}%</td>
                              <td className="px-4 py-3">{season.fg3_pct ? (season.fg3_pct * 100).toFixed(1) : '-'}%</td>
                              <td className="px-4 py-3">{season.ft_pct ? (season.ft_pct * 100).toFixed(1) : '-'}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Back Button */}
              <div className="mt-12 text-center">
                <Link href={`/team/${player.team_id}`} className="nba-btn-primary inline-block mr-4">
                  Back to Team
                </Link>
                <Link href="/" className="nba-btn-primary inline-block">
                  All Teams
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