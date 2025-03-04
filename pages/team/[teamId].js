import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

export default function TeamPage() {
  const router = useRouter();
  const { teamId } = router.query;
  
  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Only fetch when we have a teamId (after hydration)
    if (!teamId) return;

    const fetchTeamData = async () => {
      try {
        setLoading(true);
        
        // First fetch team details from the teams endpoint
        const teamsResponse = await axios.get('http://localhost:5001/api/teams');
        const teamData = teamsResponse.data.find(t => t.id === parseInt(teamId));
        
        if (!teamData) {
          setError('Team not found');
          setLoading(false);
          return;
        }
        
        setTeam(teamData);
        
        // Then fetch players for this team
        const playersResponse = await axios.get(`http://localhost:5001/api/players/team/${teamId}`);
        setPlayers(playersResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data. Please try again later.');
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [teamId]);

  // Function to handle missing player images
  const handleImageError = (e) => {
    e.target.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/logoman.png';
  };

  // Filter players based on search query
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen animated-bg">
      <Head>
        <title>
          {team ? `${team.full_name} | NBA Stats Tracker` : 'Team | NBA Stats Tracker'}
        </title>
        <meta 
          name="description" 
          content={team ? `Statistics for ${team.full_name} players` : 'NBA team statistics'} 
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
                Loading team data...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-2xl font-futuristic text-red-500">{error}</div>
            </div>
          ) : (
            <>
              {/* Team Header with Logo */}
              <div className="flex flex-col md:flex-row items-center justify-center mb-12">
                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 md:mb-0 md:mr-8">
                  <Image
                    src={`https://cdn.nba.com/logos/nba/${team.id}/primary/L/logo.svg`}
                    alt={team.full_name}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      e.target.src = 'https://cdn.nba.com/logos/nba/fallback.png';
                    }}
                  />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-futuristic font-bold mb-2">
                    {team.full_name}
                  </h2>
                  <p className="text-lg opacity-80">
                    {team.city}, {team.state} • Est. {team.year_founded}
                  </p>
                </div>
              </div>

              {/* Players Grid */}
              <h3 className="text-2xl font-futuristic font-bold mb-8 text-center">
                Players
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlayers.map((player) => (
                  <Link href={`/player/${player.id}`} key={player.id}>
                    <div className="player-card animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                      <div className="player-image">
                        <Image
                          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                          alt={player.name}
                          width={128}
                          height={128}
                          className="object-cover w-full h-full"
                          onError={handleImageError}
                        />
                      </div>
                      <h3 className="text-xl font-futuristic font-bold mb-1">{player.name}</h3>
                      <p className="text-sm opacity-80 mb-2">{player.position}</p>
                      <div className="mt-2 px-4 py-1 rounded-full bg-white/10 dark:bg-black/30 text-sm font-medium">
                        Jersey #{player.jersey_number}
                      </div>
                    </div>
                  </Link>
                ))}
                
                {filteredPlayers.length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-xl font-futuristic">No players found for this team.</p>
                  </div>
                )}
              </div>
              
              {/* Back Button */}
              <div className="mt-12 text-center">
                <Link href="/" className="nba-btn-primary inline-block">
                  Back to Teams
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