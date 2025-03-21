import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../components/ThemeToggle';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

export default function MVPRacePage() {
  const [mvpCandidates, setMvpCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    // Fetch MVP data from API
    const fetchMVPRaceData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/leaders`);
        
        // We'll use points leaders as MVP candidates but add MVP-specific stats
        const candidates = response.data.points?.map((player, index) => ({
          ...player,
          mvp_ranking: index + 1,
          mvp_points: Math.round(100 - (index * (8 - Math.min(index, 3)))),
          movement: index === 0 ? 'up' : index === 1 ? 'down' : index === 2 ? 'neutral' : (Math.random() > 0.5 ? 'up' : 'down')
        })) || [];
        
        setMvpCandidates(candidates);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching MVP race data:', err);
        setError('Failed to load MVP race data. Please try again later.');
        setLoading(false);
        
        // Generate mock data for demonstration
        generateMockMVPCandidates();
      }
    };

    fetchMVPRaceData();
  }, []);

  // Generate mock MVP candidate data for development/demo
  const generateMockMVPCandidates = () => {
    const names = [
      "Joel Embiid", "Nikola Jokić", "Shai Gilgeous-Alexander", "Luka Dončić", 
      "Giannis Antetokounmpo", "Jayson Tatum", "Anthony Edwards", "LeBron James"
    ];
    
    const teams = [
      {name: "76ers", id: 20}, {name: "Nuggets", id: 7}, {name: "Thunder", id: 21}, 
      {name: "Mavericks", id: 6}, {name: "Bucks", id: 17}, {name: "Celtics", id: 2}, 
      {name: "Timberwolves", id: 16}, {name: "Lakers", id: 13}
    ];
    
    const nicknames = [
      "The Process", "The Joker", "SGA", "Luka Magic", 
      "Greek Freak", "JT", "Ant-Man", "King James"
    ];
    
    const positions = ["C", "C", "SG", "PG", "PF", "SF", "SG", "SF"];
    const movements = ["up", "down", "neutral", "up", "down", "down", "up", "neutral"];
    
    const mockCandidates = Array(8).fill(null).map((_, index) => ({
      id: index === 0 ? "203954" : index === 1 ? "203999" : index === 2 ? "1628983" : `20399${index}`,
      name: names[index],
      nickname: nicknames[index],
      team_id: teams[index].id,
      team_name: teams[index].name,
      position: positions[index],
      pts: (30 - index * 1.2).toFixed(1),
      reb: (11 - index * 0.5).toFixed(1),
      ast: (9 - index * 0.3).toFixed(1),
      mvp_ranking: index + 1,
      mvp_points: Math.round(100 - (index * (8 - Math.min(index, 3)))),
      team_record: `${Math.round(55 - (index * 2))}-${Math.round(15 + (index * 2))}`,
      movement: movements[index]
    }));
    
    setMvpCandidates(mockCandidates);
    setLoading(false);
  };

  // Handle image loading errors
  const handleImageError = (id, type) => {
    setImageErrors(prev => ({
      ...prev,
      [`${id}_${type}`]: true
    }));
  };

  // Render movement indicator
  const renderMovementIndicator = (movement) => {
    if (movement === 'up') {
      return (
        <div className="flex flex-col">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-b-[12px] border-b-green-500 border-r-[10px] border-r-transparent mb-1"></div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-b-[12px] border-b-green-500 border-r-[10px] border-r-transparent"></div>
        </div>
      );
    } else if (movement === 'down') {
      return (
        <div className="flex flex-col">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-red-500 border-r-[10px] border-r-transparent mb-1"></div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-red-500 border-r-[10px] border-r-transparent"></div>
        </div>
      );
    } else {
      return (
        <div className="flex">
          <div className="w-[10px] h-[10px] bg-gray-700 mr-1"></div>
          <div className="w-[10px] h-[10px] bg-gray-700"></div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <Head>
        <title>NBA MVP Race Tracker | NBA Stats</title>
        <meta name="description" content="Current NBA MVP race and candidate rankings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <Link href="/" className="no-underline">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider bg-clip-text text-transparent 
                        bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse-slow">
              NBASTATS
            </h1>
          </Link>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="mb-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              NBA MVP Race
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-4">
              Updated weekly throughout the NBA season.
            </p>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl text-blue-500 dark:text-blue-400 animate-pulse flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading MVP race data...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl text-red-500">{error}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
              {mvpCandidates.slice(0, 8).map((player, index) => (
                <Link href={`/player/${player.id}`} key={player.id} className="no-underline">
                  <div className={`flex bg-navy-800 overflow-hidden rounded-md h-28 relative`}>
                    {/* Ranking Number */}
                    <div className="flex items-center justify-center w-24 md:w-32 bg-navy-900 text-white">
                      <span className="text-5xl md:text-6xl font-bold">{index + 1}</span>
                    </div>
                    
                    {/* Player Name and Team */}
                    <div className="flex-1 text-white p-4 flex flex-col justify-center">
                      <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wider leading-none">
                        {player.name.split(' ')[0]}
                      </h3>
                      <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wider leading-none mb-1">
                        {player.name.split(' ').slice(1).join(' ')}
                      </h3>
                    </div>
                    
                    {/* Team Logo */}
                    <div className="w-32 h-28 relative overflow-hidden flex-shrink-0">
                      {!imageErrors[`${player.team_id}_team`] ? (
                        <Image 
                          src={`https://cdn.nba.com/logos/nba/${player.team_id}/primary/L/logo.svg`}
                          alt={player.team_name}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(player.team_id, 'team')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                          {player.team_name}
                        </div>
                      )}
                    </div>
                    
                    {/* Player Image */}
                    <div className="w-28 h-28 relative overflow-hidden flex-shrink-0">
                      {!imageErrors[`${player.id}_player`] ? (
                        <Image 
                          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                          alt={player.name}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(player.id, 'player')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Movement Indicator */}
                    <div className="absolute right-4 top-4">
                      {renderMovementIndicator(player.movement)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-sm opacity-70">
          <p className="font-serif">© 2025 NBA Stats | Weaver</p>
        </footer>
      </div>
    </div>
  );
} 