import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from nba_api import stats

# Configure NBA API headers
NBA_HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
    'sec-ch-ua': '"Google Chrome";v="91", "Chromium";v="91"',
    'sec-ch-ua-mobile': '?0',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site'
}

# Set headers for all NBA API endpoints
stats.static.teams.HEADERS = NBA_HEADERS
stats.static.players.HEADERS = NBA_HEADERS
stats.endpoints.commonplayerinfo.HEADERS = NBA_HEADERS
stats.endpoints.playercareerstats.HEADERS = NBA_HEADERS
stats.endpoints.teamyearbyyearstats.HEADERS = NBA_HEADERS
stats.endpoints.leaguedashteamstats.HEADERS = NBA_HEADERS
stats.endpoints.leaguestandings.HEADERS = NBA_HEADERS
stats.endpoints.commonteamroster.HEADERS = NBA_HEADERS
stats.endpoints.playerdashboardbyyearoveryear.HEADERS = NBA_HEADERS

def get_request_session():
    """Create a requests session with retry strategy"""
    session = requests.Session()
    retry_strategy = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(NBA_HEADERS)
    return session

# Default timeout for API requests
DEFAULT_TIMEOUT = 60 