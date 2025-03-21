# NBASTATS - NBA Statistics Tracker

A state-of-the-art NBA statistics tracker application with live data updates, modern UI, and comprehensive statistics for teams and players.

![NBASTATS Screenshot](public/images/nbastats_screenshot.png)

## Features

- **Home Page**: Grid view of all 30 NBA teams with logos, searchable, and real-time standings
- **Team Pages**: Detailed team information, stats, and complete roster
- **Player Pages**: Comprehensive player statistics with interactive charts
- **Live Updates**: Real-time data during games with appropriate UI indicators
- **Modern UI**: Sleek design with dark/light mode support
- **Responsive**: Mobile-friendly design that works on all screen sizes

## Tech Stack

### Frontend
- **Next.js** - React framework for server-rendered applications
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js/react-chartjs-2** - Data visualization for player statistics
- **next-themes** - Theme switching (dark/light mode)
- **Axios** - HTTP client for API requests

### Backend
- **Flask** - Lightweight Python web framework
- **SQLite** - Database for persistent storage
- **nba_api** - Official NBA API wrapper for Python
- **Schedule** - Python job scheduling for data updates

## Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- pip

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/nbastats.git
cd nbastats
```

2. Install frontend dependencies
```bash
npm install
```

3. Install backend dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local` if needed.

### Running the application

1. Start the Flask API server
```bash
npm run api:start
```

2. In a separate terminal, start the Next.js frontend
```bash
npm run dev
```

3. (Optional) Run both together with concurrently
```bash
npm run dev:all
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Data Management

The application uses the following data management strategy:

1. **Initial Data Fetch**: NBA data is fetched from the nba_api and stored in JSON files
2. **Persistent Storage**: Data is stored in SQLite database for fast access
3. **Polling**: During active games, data is refreshed every 30 seconds, otherwise every 5 minutes
4. **API Endpoints**: Flask provides RESTful endpoints to serve data to the frontend

## Project Structure

```
nbastats/
├── api/                 # Next.js API routes (fallback)
├── app.py               # Flask API server
├── components/          # React components
├── data/                # Data storage directory
│   ├── general/         # Combined data files
│   ├── players/         # Player-specific data
│   ├── stats/           # Statistical data
│   └── teams/           # Team-specific data
├── pages/               # Next.js pages
│   ├── index.js         # Home page
│   ├── player/          # Player pages
│   └── team/            # Team pages
├── public/              # Static assets
├── scripts/             # Utility scripts
│   └── fetch_data.py    # Data fetching script
├── styles/              # Global styles
└── team_data/           # Team-specific JSON files
```

## API Endpoints

- **GET /api/teams**: Returns all NBA teams
- **GET /api/teams/:teamId**: Returns details for a specific team
- **GET /api/players/:playerId**: Returns details for a specific player
- **GET /api/standings**: Returns current NBA standings
- **GET /api/live-games**: Returns data for active games
- **GET /api/status**: Returns API status information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [NBA API](https://github.com/swar/nba_api) for providing NBA data
- [NBA.com](https://www.nba.com) for team logos and player images 