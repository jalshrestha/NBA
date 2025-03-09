# Deployment Guide

This guide will help you deploy the NBAPRO application to production.

## Frontend Deployment (Vercel)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Production-ready code"
   git push
   ```

2. Connect your GitHub repository to Vercel:
   - Go to [Vercel](https://vercel.com) and sign in
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: npm run build
     - Output Directory: .next

3. Add environment variables:
   - Go to your project settings in Vercel
   - Navigate to "Environment Variables"
   - Add the following variable:
     - Name: `NEXT_PUBLIC_API_URL`
     - Value: `https://your-api-domain.herokuapp.com/api` (replace with your actual API URL)

4. Deploy the project:
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Once deployed, you'll get a URL for your application

## Backend Deployment (Heroku)

1. Create a Heroku account at [Heroku](https://heroku.com) if you don't have one.

2. Install the Heroku CLI:
   ```bash
   npm install -g heroku
   ```

3. Login to Heroku:
   ```bash
   heroku login
   ```

4. Navigate to the API directory:
   ```bash
   cd api
   ```

5. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```

6. Initialize a git repository for the API:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

7. Deploy to Heroku:
   ```bash
   git push heroku master
   ```

8. Scale the dyno:
   ```bash
   heroku ps:scale web=1
   ```

9. Open the app:
   ```bash
   heroku open
   ```

10. Update the `NEXT_PUBLIC_API_URL` in your Vercel environment variables to point to your Heroku app.

## Alternative Backend Deployment Options

### DigitalOcean App Platform

1. Create a DigitalOcean account
2. Go to the App Platform
3. Create a new app
4. Connect your GitHub repository
5. Configure the app:
   - Type: Web Service
   - Source Directory: api/
   - Build Command: pip install -r requirements.txt
   - Run Command: gunicorn app:app
6. Add environment variables as needed
7. Deploy the app

### AWS Elastic Beanstalk

1. Create an AWS account
2. Install the AWS CLI and EB CLI
3. Initialize an EB application:
   ```bash
   cd api
   eb init
   ```
4. Create an environment:
   ```bash
   eb create
   ```
5. Deploy the application:
   ```bash
   eb deploy
   ```

## Monitoring and Maintenance

- Set up monitoring for your application using services like New Relic, Datadog, or Sentry
- Regularly update dependencies to ensure security and performance
- Set up automated backups for any data
- Implement CI/CD pipelines for automated testing and deployment 