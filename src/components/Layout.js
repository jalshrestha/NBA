import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const Layout = ({ children, title = 'NBA Stats Tracker' }) => {
  return (
    <div className="min-h-screen bg-gradient-light dark:bg-gradient-dark transition-colors duration-300">
      <Head>
        <title>{title}</title>
        <meta name="description" content="NBA Statistics Tracker - Real-time NBA player and team statistics" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="container mx-auto px-4 py-8 animate-fade-in">
        {children}
      </main>

      <footer className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-inner mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} NBA Stats Tracker. All rights reserved.</p>
          <p className="text-sm mt-2">
            Data provided by the NBA API. This site is not affiliated with the NBA.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 