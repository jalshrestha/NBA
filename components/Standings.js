import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const Standings = () => {
  const [standings, setStandings] = useState({
    eastern: [],
    western: [],
    last_updated: null,
    season: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeConference, setActiveConference] = useState('eastern');

  const fetchStandings = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Add force_refresh parameter if needed
      const endpoint = forceRefresh 
        ? `${API_URL}/standings?force_refresh=true` 
        : `${API_URL}/standings`;
      
      const response = await axios.get(endpoint);
      if (response.data && response.data.eastern && response.data.western) {
        setStandings(response.data);
      } else {
        setError('Invalid standings data format');
      }
      
      if (forceRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError('Failed to load standings. Please try again later.');
      if (forceRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStandings();
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchStandings(true);
  };

  // Format the last updated time
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Standings</h2>
          {standings.season && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Season: {standings.season}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </>
            )}
          </button>
          
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveConference('eastern')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                activeConference === 'eastern'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Eastern
            </button>
            <button
              onClick={() => setActiveConference('western')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                activeConference === 'western'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Western
            </button>
          </div>
        </div>
      </div>

      {standings.last_updated && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Last updated: {formatLastUpdated(standings.last_updated)}
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center">
          <p className="text-sm opacity-70">Loading standings...</p>
        </div>
      ) : error ? (
        <div className="py-4 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                <th className="px-2 py-2 w-10 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Team</th>
                <th className="px-2 py-2 text-center font-medium">W</th>
                <th className="px-2 py-2 text-center font-medium">L</th>
                <th className="px-2 py-2 text-center font-medium">PCT</th>
                <th className="px-2 py-2 text-center font-medium">GB</th>
                <th className="px-2 py-2 text-center font-medium">L10</th>
              </tr>
            </thead>
            <tbody>
              {standings[activeConference].map((team, index) => (
                <tr 
                  key={team.id} 
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-2 py-2 font-medium">{team.confRank}</td>
                  <td className="px-2 py-2">
                    <Link href={`/team/${team.id}`} className="flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                      <span>{team.teamName}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center">{team.wins}</td>
                  <td className="px-2 py-2 text-center">{team.losses}</td>
                  <td className="px-2 py-2 text-center">{team.winPct.toFixed(3)}</td>
                  <td className="px-2 py-2 text-center">{team.gb}</td>
                  <td className="px-2 py-2 text-center">{team.lastTen || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Standings; 