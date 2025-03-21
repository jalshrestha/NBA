import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../components/ThemeToggle';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

// Define the main statistical categories
const categories = [
  { id: 'points', name: 'Points', abbr: 'PTS', statKey: 'pts' },
  { id: 'rebounds', name: 'Rebounds', abbr: 'REB', statKey: 'reb' },
  { id: 'assists', name: 'Assists', abbr: 'AST', statKey: 'ast' },
  { id: 'steals', name: 'Steals', abbr: 'STL', statKey: 'stl' },
  { id: 'blocks', name: 'Blocks', abbr: 'BLK', statKey: 'blk' }
];

export default function LeadersPage() {
  const [leaders, setLeaders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('points');
  const [imageErrors, setImageErrors] = useState({});
  const [mvpCandidates, setMvpCandidates] = useState([]);

  useEffect(() => {
    // Fetch leaders data from API
    const fetchLeaders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/leaders`);
        setLeaders(response.data);
        
        // Extract top 5 points leaders as MVP candidates and add MVP-specific stats
        if (response.data.points && response.data.points.length > 0) {
          const candidates = response.data.points.slice(0, 5).map(player => ({
            ...player,
            mvp_score: (Math.random() * 5 + 5).toFixed(1), // Mock MVP score out of 10
            team_record: `${Math.floor(Math.random() * 15) + 35}-${Math.floor(Math.random() * 15) + 10}`,
            win_pct: (Math.random() * 0.3 + 0.6).toFixed(3)
          }));
          setMvpCandidates(candidates);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaders:', err);
        setError('Failed to load MVP race data. Please try again later.');
        setLoading(false);
        
        // For demo purposes, generate mock data if API fails
        generateMockLeaders();
      }
    };

    fetchLeaders();
  }, []);

  // Generate mock data for development/demo
  const generateMockLeaders = () => {
    const mockLeaders = {};
    const mockMvpCandidates = [];
    
    categories.forEach(category => {
      mockLeaders[category.id] = Array(10).fill(null).map((_, index) => {
        const player = {
          id: `player${index + 1}`,
          name: `Player ${index + 1}`,
          team_id: Math.floor(Math.random() * 30) + 1,
          team_name: `Team ${Math.floor(Math.random() * 30) + 1}`,
          position: ['PG', 'SG', 'SF', 'PF', 'C'][Math.floor(Math.random() * 5)],
          [category.statKey]: (30 - index * (index < 5 ? 1.5 : 1)).toFixed(1)
        };
        
        // Add top 5 points leaders to MVP candidates
        if (category.id === 'points' && index < 5) {
          mockMvpCandidates.push({
            ...player,
            mvp_score: (Math.random() * 5 + 5).toFixed(1), // Mock MVP score out of 10
            team_record: `${Math.floor(Math.random() * 15) + 35}-${Math.floor(Math.random() * 15) + 10}`,
            win_pct: (Math.random() * 0.3 + 0.6).toFixed(3)
          });
        }
        
        return player;
      });
    });
    
    setLeaders(mockLeaders);
    setMvpCandidates(mockMvpCandidates);
    setLoading(false);
  };

  // Handle image loading errors
  const handleImageError = (playerId) => {
    setImageErrors(prev => ({
      ...prev,
      [playerId]: true
    }));
  };

  return (
    <div className="min-h-screen animated-bg">
      <Head>
        <title>NBA MVP Race | NBA Stats Tracker</title>
        <meta name="description" content="Current MVP candidates and statistical leaders in the NBA" />
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
          </div>

          <div className="relative">
            <ThemeToggle className="ml-4" />
          </div>
        </header>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
            NBA MVP Race
          </h2>
          
          {/* MVP Race Section */}
          {!loading && !error && mvpCandidates.length > 0 && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl">
                <h3 className="text-xl font-bold">MVP Race Tracker</h3>
                <p className="text-sm opacity-80">Top candidates based on performance and team success</p>
              </div>
              
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-b-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="py-3 px-4 text-left">#</th>
                        <th className="py-3 px-4 text-left">Player</th>
                        <th className="py-3 px-4 text-center">MVP Score</th>
                        <th className="py-3 px-4 text-center">PTS</th>
                        <th className="py-3 px-4 text-center">Team Record</th>
                        <th className="py-3 px-4 text-center">Win %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mvpCandidates.map((player, index) => (
                        <tr key={player.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-4 px-4 font-bold text-gray-500">{index + 1}</td>
                          <td className="py-4 px-4">
                            <Link href={`/player/${player.id}`}>
                              <div className="flex items-center">
                                <div className="relative w-10 h-10 mr-3 rounded-full overflow-hidden">
                                  <Image
                                    src={imageErrors[player.id] ? 
                                      '/images/player-placeholder.png' : 
                                      `https://cdn.nba.com/headshots/nba/latest/260x190/${player.id}.png`
                                    }
                                    alt={player.name}
                                    fill
                                    className="object-cover"
                                    onError={() => handleImageError(player.id)}
                                  />
                                </div>
                                <div>
                                  <div className="font-bold text-gray-800 dark:text-white">{player.name}</div>
                                  <div className="text-xs text-gray-500">{player.position} | {player.team_name}</div>
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-block px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                              {player.mvp_score}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-gray-800 dark:text-white">{player.pts}</td>
                          <td className="py-4 px-4 text-center text-gray-800 dark:text-white">{player.team_record}</td>
                          <td className="py-4 px-4 text-center text-gray-800 dark:text-white">{player.win_pct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Category Navigation */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeCategory === category.id 
                    ? 'bg-neon-blue text-white' 
                    : 'bg-white/10 dark:bg-black/30 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-black/50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-futuristic text-neon-blue dark:text-neon-purple animate-pulse">
                Loading statistical leaders...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-futuristic text-red-500">{error}</div>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {categories.find(c => c.id === activeCategory)?.name} Leaders
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {leaders[activeCategory]?.map((player, index) => (
                  <Link href={`/player/${player.id}`} key={player.id}>
                    <div className="flex items-center bg-white/50 dark:bg-gray-700/50 p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex-shrink-0 font-bold text-gray-400 dark:text-gray-500 text-xl w-10">
                        {index + 1}
                      </div>
                      
                      <div className="relative w-14 h-14 mr-4 rounded-full overflow-hidden">
                        <Image
                          src={imageErrors[player.id] ? 
                            '/images/player-placeholder.png' : 
                            `https://cdn.nba.com/headshots/nba/latest/260x190/${player.id}.png`
                          }
                          alt={player.name}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(player.id)}
                        />
                      </div>
                      
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-800 dark:text-white">{player.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {player.position} | {player.team_name}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 text-center">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {player[categories.find(c => c.id === activeCategory)?.statKey]}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {categories.find(c => c.id === activeCategory)?.abbr}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {(!leaders[activeCategory] || leaders[activeCategory].length === 0) && (
                  <div className="text-center py-10">
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      No stats available for this category.
                    </p>
                  </div>
                )}
              </div>
            </div>
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