# NBAPRO

A modern, professional NBA statistics tracking application built with Next.js and Flask.

## Project Structure

```
├── api/                  # Flask backend
│   ├── data/             # Data files
│   ├── utils/            # Utility functions
│   ├── app.py            # Main Flask application
│   ├── requirements.txt  # Python dependencies
│   ├── Procfile          # Heroku deployment
│   └── runtime.txt       # Python version for Heroku
├── components/           # React components
├── pages/                # Next.js pages
├── public/               # Static assets
├── styles/               # CSS styles
├── .env.local            # Local environment variables
├── .env.production       # Production environment variables
├── next.config.js        # Next.js configuration
├── package.json          # Node.js dependencies
├── tailwind.config.js    # Tailwind CSS configuration
└── vercel.json           # Vercel deployment configuration
```

## Local Development

### Frontend (Next.js)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend (Flask)

1. Create a virtual environment:
   ```bash
   cd api
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask server:
   ```bash
   python app.py
   ```

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub.
2. Connect your GitHub repository to Vercel.
3. Vercel will automatically deploy your application.
4. Set the `NEXT_PUBLIC_API_URL` environment variable in Vercel to point to your deployed API.

### Backend (Heroku)

1. Create a Heroku account and install the Heroku CLI.
2. Navigate to the API directory:
   ```bash
   cd api
   ```
3. Create a Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Deploy to Heroku:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku master
   ```
5. Update the `NEXT_PUBLIC_API_URL` in your Vercel environment variables to point to your Heroku app.

## Features

- View all NBA teams
- View team rosters and player details
- View player statistics
- View league standings
- Dark/light mode toggle
- Responsive design

## Technologies

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Flask, NBA API
- **Deployment**: Vercel (frontend), Heroku (backend)

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