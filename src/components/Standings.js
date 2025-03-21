import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

const Standings = () => {
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeConference, setActiveConference] = useState('eastern');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/standings`);
        setStandings(response.data);
        setLastUpdated(response.data.last_updated || new Date().toISOString());
        setError(null);
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load standings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();

    // Set up polling for updates
    const intervalId = setInterval(fetchStandings, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle image loading errors
  const handleImageError = (teamId) => {
    setImageErrors(prev => ({
      ...prev,
      [teamId]: true
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue dark:border-neon-purple"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading standings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (!standings || !standings.eastern || !standings.western) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Notice:</strong>
        <span className="block sm:inline"> No standings data available.</span>
      </div>
    );
  }

  const conferenceData = standings[activeConference] || [];

  // Format win percentage as a percentage
  const formatWinPct = (pct) => {
    if (pct === undefined || pct === null) return '0.0%';
    return (pct * 100).toFixed(1) + '%';
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-900 dark:to-indigo-900 text-white p-4">
        <h2 className="text-xl font-futuristic font-bold">NBA Standings</h2>
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`flex-1 py-2 px-4 text-center font-medium ${
            activeConference === 'eastern'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={() => setActiveConference('eastern')}
        >
          Eastern
        </button>
        <button
          className={`flex-1 py-2 px-4 text-center font-medium ${
            activeConference === 'western'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={() => setActiveConference('western')}
        >
          Western
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
              <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
              <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">W</th>
              <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">L</th>
              <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Win %</th>
              <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">GB</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {conferenceData.map((team, index) => (
              <tr key={team.team_id} 
                className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'} 
                           ${index < 6 ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{team.conf_rank || index + 1}</td>
                <td className="px-2 py-3 whitespace-nowrap">
                  <Link href={`/team/${team.team_id}`} className="flex items-center group">
                    <div className="flex-shrink-0 h-8 w-8 relative">
                      <Image 
                        src={imageErrors[team.team_id] ? 
                          '/images/fallback-logo.png' : 
                          team.logo_url || `https://cdn.nba.com/logos/nba/${team.team_id}/primary/L/logo.svg`
                        }
                        alt={team.name || team.team_name}
                        width={32}
                        height={32}
                        onError={() => handleImageError(team.team_id)}
                      />
                    </div>
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {team.name || team.team_name}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{team.wins}</td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{team.losses}</td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatWinPct(team.win_pct || team.winPct)}</td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{team.games_behind || team.gb || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></div>
          <span>Playoff teams</span>
        </div>
        <div className="mt-1">
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default Standings; 