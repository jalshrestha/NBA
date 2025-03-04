# NBA Stats Tracker

A full-stack web application that displays real-time NBA statistics, including player stats, team information, and league standings.

## Features

- Real-time NBA player statistics
- Team rosters and information
- League standings
- Player search functionality
- Responsive design with dark/light mode
- Live data from official NBA API

## Tech Stack

### Frontend
- Next.js
- React
- Tailwind CSS
- Axios

### Backend
- Flask (Python)
- NBA API
- JSON for caching

## Setup

1. Clone the repository:
```bash
git clone https://github.com/jalshrestha/NBA.git
cd NBA
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python app.py
```

5. Start the frontend development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
NBA/
├── app.py              # Flask backend server
├── pages/             # Next.js pages
├── components/        # React components
├── styles/           # CSS styles
├── public/           # Static assets
└── requirements.txt  # Python dependencies
```

## API Endpoints

- `/api/teams` - Get all NBA teams
- `/api/players` - Get all NBA players
- `/api/players/team/<team_id>` - Get players for a specific team
- `/api/player/<player_id>/stats` - Get stats for a specific player
- `/api/standings` - Get current NBA standings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 