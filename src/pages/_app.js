import { ThemeProvider } from 'next-themes';
// Global styles must be imported directly in _app.js
import '@/styles/globals.css';  // Using the alias defined in jsconfig.json
// LOG: Testing CSS import approaches
console.log('App initialization - CSS path debugging');
// Import attempt removed temporarily for debugging
// import styles from '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  console.log('MyApp rendering, CSS should be applied');
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp; 