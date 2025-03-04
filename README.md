# NBA Stats Tracker

A futuristic NBA statistics tracker with a Python Flask backend and Next.js frontend. This application fetches NBA data from the nba_api, caches it, and presents it in a sleek, responsive user interface with a 2030 design vision.

## Features

- **Backend**:
  - Flask REST API with endpoints for teams and players
  - Daily data updates at midnight using scheduling
  - Data caching mechanism to reduce API calls
  
- **Frontend**:
  - Modern, responsive UI built with Next.js and Tailwind CSS
  - Futuristic design with neon accents, smooth animations, and glass-like effects
  - Light/dark mode toggle
  - Team and player browsing functionality

## Project Structure

```
nba-stats-app/
├── backend/
│   ├── app.py                  # Flask API server
│   ├── requirements.txt        # Python dependencies
│   ├── nba_data.json           # Cached NBA data
│   └── last_update.txt         # Timestamp of last update
├── frontend/
│   ├── components/             # React components
│   │   └── ThemeToggle.js      # Dark/light mode toggle
│   ├── pages/                  # Next.js pages
│   │   ├── _app.js             # App configuration
│   │   ├── index.js            # Homepage with team logos
│   │   └── team/[teamId].js    # Team page with player cards
│   ├── public/                 # Static assets
│   │   ├── logos/              # Team logos (e.g., lal.png)
│   │   └── players/            # Player images (e.g., 237.jpg)
│   ├── styles/                 # CSS styles
│   │   └── globals.css         # Global styles and Tailwind directives
│   ├── next.config.js          # Next.js configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   ├── postcss.config.js       # PostCSS configuration
│   └── package.json            # JavaScript dependencies
└── README.md                   # Project documentation
```

## Setup and Installation

### Backend (Flask)

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```
   python app.py
   ```
   The server will start on http://localhost:5000

### Frontend (Next.js)

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```
   The app will be available at http://localhost:3000

## Assets Requirements

### Team Logos
Place team logo images in the `/public/logos/` directory with the following naming convention:
- Filename: `{team_abbreviation}.png` (lowercase)
- Example: `/public/logos/lal.png` for Los Angeles Lakers

### Player Images
Place player images in the `/public/players/` directory with the following naming convention:
- Filename: `{player_id}.jpg`
- Example: `/public/players/2544.jpg` for LeBron James

You can also create a default image:
- `/public/players/default-player.png` (fallback for missing player images)
- `/public/logos/nba-default.png` (fallback for missing team logos)

## Production Deployment

1. Build the Next.js frontend:
   ```
   cd frontend
   npm run build
   ```

2. For the Flask backend, consider using Gunicorn with a process manager like Supervisor or PM2.

## License

This project is for demonstration purposes only. All NBA-related data and imagery are property of their respective owners. 