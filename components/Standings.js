import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

const Standings = () => {
  const [standings, setStandings] = useState({
    eastern: [],
    western: []
  });
  const [loading, setLoading] = useState(true);
  const [activeConference, setActiveConference] = useState('eastern');

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/standings');
        setStandings(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching standings:', err);
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  return (
    <div className="bg-white/10 dark:bg-black/30 backdrop-blur-sm rounded-xl p-4 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-futuristic font-bold">Standings</h2>
        <div className="flex rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveConference('eastern')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              activeConference === 'eastern'
                ? 'bg-neon-blue text-white dark:bg-neon-purple dark:text-white'
                : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/40'
            }`}
          >
            Eastern
          </button>
          <button
            onClick={() => setActiveConference('western')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              activeConference === 'western'
                ? 'bg-neon-blue text-white dark:bg-neon-purple dark:text-white'
                : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/40'
            }`}
          >
            Western
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <p className="text-sm opacity-70">Loading standings...</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 w-10">#</th>
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center">W</th>
                <th className="pb-2 text-center">L</th>
                <th className="pb-2 text-center">PCT</th>
                <th className="pb-2 text-center">GB</th>
              </tr>
            </thead>
            <tbody>
              {standings[activeConference].map((team, index) => (
                <tr 
                  key={team.id} 
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/5 dark:hover:bg-white/5"
                >
                  <td className="py-2 font-medium">{index + 1}</td>
                  <td className="py-2">
                    <Link href={`/team/${team.id}`} className="flex items-center hover:text-neon-blue dark:hover:text-neon-purple">
                      <span className="ml-1">{team.teamName}</span>
                    </Link>
                  </td>
                  <td className="py-2 text-center">{team.wins}</td>
                  <td className="py-2 text-center">{team.losses}</td>
                  <td className="py-2 text-center">{team.winPct.toFixed(3)}</td>
                  <td className="py-2 text-center">{team.gb}</td>
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