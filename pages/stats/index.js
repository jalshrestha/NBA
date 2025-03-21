import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy, ChevronRight } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

// Statistical categories for filtering
const CATEGORIES = [
  { id: 'points', name: 'Points', abbr: 'PPG', statKey: 'points' },
  { id: 'rebounds', name: 'Rebounds', abbr: 'RPG', statKey: 'rebounds' },
  { id: 'assists', name: 'Assists', abbr: 'APG', statKey: 'assists' },
  { id: 'steals', name: 'Steals', abbr: 'SPG', statKey: 'steals' },
  { id: 'blocks', name: 'Blocks', abbr: 'BPG', statKey: 'blocks' }
];

// Trend indicator component
const TrendIndicator = ({ trend }) => {
  if (trend === 'up') {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  } else if (trend === 'down') {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
};

// Medal background colors for top 3 players
const getRankBgColor = (rank) => {
  switch (rank) {
    case 1: return 'bg-gradient-to-br from-yellow-400 to-yellow-600'; // Gold
    case 2: return 'bg-gradient-to-br from-gray-300 to-gray-500'; // Silver
    case 3: return 'bg-gradient-to-br from-amber-600 to-amber-800'; // Bronze
    default: return 'bg-gradient-to-br from-gray-700 to-gray-900'; // Dark Gray
  }
};

export default function StatsPage() {
  const [stats, setStats] = useState({ players: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('points');
  const [imageErrors, setImageErrors] = useState({});
  const [previousRankings, setPreviousRankings] = useState({});

  useEffect(() => {
    // Fetch stats data
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/stats?category=${activeCategory}&limit=5`);
        
        // Store current rankings before updating
        if (stats.players?.length > 0) {
          const rankings = {};
          stats.players.forEach((player, index) => {
            rankings[player.id] = index + 1;
          });
          setPreviousRankings(rankings);
        }
        
        // Process players and add trend information
        const processedPlayers = response.data.players.map((player, index) => {
          const prevRank = previousRankings[player.id] || 0;
          let trend = 'same';
          
          if (prevRank > 0) {
            if (prevRank < index + 1) {
              trend = 'down';
            } else if (prevRank > index + 1) {
              trend = 'up';
            }
          }
          
          return {
            ...player,
            previousRank: prevRank,
            trend
          };
        });
        
        setStats({
          ...response.data,
          players: processedPlayers
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistical leaders. Please try again later.');
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeCategory]);

  // Handle image loading errors
  const handleImageError = (playerId) => {
    setImageErrors(prev => ({
      ...prev,
      [playerId]: true
    }));
  };

  // Find the maximum value for the active stat category among players
  const getMaxStatValue = () => {
    if (!stats.players || stats.players.length === 0) return 0;
    const category = CATEGORIES.find(c => c.id === activeCategory);
    return Math.max(...stats.players.map(p => p.stats[category.statKey]));
  };

  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // Stat bar animation variants
  const statBarVariants = {
    hidden: { width: 0 },
    show: { 
      width: '100%',
      transition: {
        delay: 0.3,
        duration: 0.7,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Head>
        <title>STATS | NBAPRO</title>
        <meta name="description" content="Top NBA statistical leaders and MVP candidates" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <Link href="/" className="no-underline">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent 
                        bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse-slow">
              NBAPRO
            </h1>
          </Link>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600">
            STATS
          </h2>
          <p className="text-gray-400 text-lg mb-6">
            The league's statistical leaders across key categories, updated daily.
          </p>
          
          {/* Category Navigation */}
          <div className="flex flex-wrap gap-2 mb-10 bg-gray-800/50 p-4 rounded-xl backdrop-blur-sm">
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`relative px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeCategory === category.id 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/30' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category.name}
                {activeCategory === category.id && (
                  <motion.span 
                    layoutId="categoryIndicator"
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-yellow-400 rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-bold text-blue-400 animate-pulse">
                Loading stats...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl text-red-500">{error}</div>
            </div>
          ) : (
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              key={activeCategory} // Re-animate when category changes
            >
              {stats.players?.map((player, index) => {
                const rank = index + 1;
                const selectedCategory = CATEGORIES.find(c => c.id === activeCategory);
                const maxValue = getMaxStatValue();
                const statValue = player.stats[selectedCategory.statKey];
                const statPercentage = (statValue / maxValue) * 100;
                
                return (
                  <motion.div 
                    key={player.id} 
                    variants={itemVariants}
                    className="relative bg-gray-800/80 rounded-xl overflow-hidden backdrop-blur-sm shadow-lg border border-gray-700"
                  >
                    {/* Rank indicator */}
                    <div className={`absolute top-0 left-0 w-14 h-14 flex items-center justify-center text-2xl font-bold text-white ${getRankBgColor(rank)}`}>
                      {rank}
                    </div>
                    
                    {/* Trophy for #1 */}
                    {rank === 1 && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="absolute top-4 right-4 text-yellow-400"
                      >
                        <Trophy className="w-8 h-8" />
                      </motion.div>
                    )}
                    
                    {/* Card content */}
                    <div className="p-6 pl-20">
                      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        {/* Player image and basic info */}
                        <div className="flex items-center gap-5">
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-600">
                            <Image
                              src={imageErrors[player.id] ? 
                                '/images/player-placeholder.png' : 
                                player.headshot_url
                              }
                              alt={player.name}
                              fill
                              className="object-cover"
                              onError={() => handleImageError(player.id)}
                            />
                          </div>
                          
                          <div>
                            <h3 className="text-2xl font-bold mb-1">{player.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 rounded-full text-xs font-bold" 
                                  style={{ backgroundColor: player.team.color }}>
                                {player.team.abbreviation}
                              </span>
                              <span className="text-gray-400">{player.position}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              {player.previousRank > 0 && (
                                <>
                                  <span>Previous: #{player.previousRank}</span>
                                  <TrendIndicator trend={player.trend} />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Stats grid */}
                        <div className="flex-grow grid grid-cols-5 gap-4 w-full">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{player.stats.points}</div>
                            <div className="text-xs text-gray-400">PPG</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{player.stats.rebounds}</div>
                            <div className="text-xs text-gray-400">RPG</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{player.stats.assists}</div>
                            <div className="text-xs text-gray-400">APG</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{player.stats.steals}</div>
                            <div className="text-xs text-gray-400">SPG</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{player.stats.blocks}</div>
                            <div className="text-xs text-gray-400">BPG</div>
                          </div>
                        </div>
                        
                        {/* Team record */}
                        <div className="text-center">
                          <div className="text-lg font-bold">{player.team.record}</div>
                          <div className="text-xs text-gray-400">Record</div>
                        </div>
                        
                        {/* View profile link */}
                        <Link href={`/player/${player.id}`} className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                          View Profile
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                      
                      {/* Highlighted stat bar */}
                      <div className="mt-6">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{selectedCategory.name}</span>
                          <span>{statValue} {selectedCategory.abbr}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${statPercentage}%`,
                              backgroundColor: player.team.color 
                            }}
                            variants={statBarVariants}
                            initial="hidden"
                            animate="show"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {(!stats.players || stats.players.length === 0) && (
                <div className="text-center py-10">
                  <p className="text-lg font-medium text-gray-400">
                    No stats available for this category.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-gray-500 border-t border-gray-800">
          <p>© 2025 NBAPRO | All stats updated daily</p>
        </footer>
      </div>
    </div>
  );
} 