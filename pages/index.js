import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../components/ThemeToggle';
import Standings from '../components/Standings';
import axios from 'axios';

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStandings, setShowStandings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch teams from API
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5001/api/teams');
        setTeams(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams. Please try again later.');
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Filter teams based on search query
  const filteredTeams = teams.filter(team => 
    team.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen animated-bg">
      <Head>
        <title>NBA Stats Tracker | Futuristic NBA Statistics</title>
        <meta name="description" content="A futuristic NBA statistics tracker app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <Link href="/" className="no-underline">
              <h1 className="text-3xl md:text-4xl font-futuristic font-bold tracking-wider bg-clip-text text-transparent 
                          bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse-slow">
                NBASTATS
              </h1>
            </Link>
            
            {/* Standings Button - Moved to header area */}
            <button
              onClick={() => setShowStandings(!showStandings)}
              className="px-4 py-2 text-sm font-medium rounded-full 
                       bg-white/10 border border-gray-300 dark:border-gray-700
                       text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-black/30
                       transition-colors duration-200 focus:outline-none focus:ring-2 
                       focus:ring-neon-blue dark:focus:ring-neon-purple"
            >
              {showStandings ? 'Hide Standings' : 'Show Standings'}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search teams..."
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

        {/* Main content with optional standings sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Teams Grid */}
          <main className={`${showStandings ? 'lg:w-2/3' : 'w-full'}`}>
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-2xl font-futuristic text-neon-blue dark:text-neon-purple animate-pulse">
                  Loading teams...
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-2xl font-futuristic text-red-500">{error}</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredTeams.map((team) => (
                    <Link href={`/team/${team.id}`} key={team.id} className="no-underline">
                      <div className="team-logo-container">
                        <div className="relative w-24 h-24 mb-2">
                          <Image
                            src={`https://cdn.nba.com/logos/nba/${team.id}/primary/L/logo.svg`}
                            alt={team.full_name}
                            fill
                            className="team-logo object-contain"
                            onError={(e) => {
                              // Fallback image if logo not found
                              e.target.src = 'https://cdn.nba.com/logos/nba/fallback.png';
                            }}
                          />
                        </div>
                        <h3 className="text-sm md:text-base font-futuristic text-center">
                          {team.full_name}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </main>

          {/* Standings Sidebar (visible when showStandings is true) */}
          {showStandings && (
            <aside className="lg:w-1/3 flex-shrink-0">
              <Standings />
            </aside>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-sm opacity-70">
          <p>© {new Date().getFullYear()} NBA Stats Tracker | Futuristic Design</p>
        </footer>
      </div>
    </div>
  );
} 