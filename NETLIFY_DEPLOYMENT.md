# Deploying Help Desk SaaS on Netlify with Supabase

This guide provides step-by-step instructions for deploying the Help Desk SaaS application on Netlify with Supabase as the database backend.

## Prerequisites

1. A Netlify account (https://netlify.com)
2. A Supabase account (https://supabase.com)
3. Node.js and npm installed locally

## Step 1: Set Up Supabase

1. Log in to your Supabase account and create a new project
2. Note your Supabase URL and API keys (anon key and service role key)
3. Run the database schema setup script:

```sql
-- Copy the contents of supabase-migration/supabase-schema.sql
-- Run this in the Supabase SQL editor
```

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

For the client application, create a `.env` file in the `client` directory:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 3: Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

## Step 4: Build the Application

```bash
# Build the client application
npm run build
```

## Step 5: Deploy to Netlify

### Option 1: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize Netlify site:
```bash
netlify init
```

4. Deploy the site:
```bash
netlify deploy --prod
```

### Option 2: Deploy via Netlify Dashboard

1. Log in to your Netlify account
2. Click "New site from Git"
3. Connect to your Git repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `client/dist`
5. Add environment variables in the Netlify dashboard:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
6. Deploy the site

## Step 6: Configure Netlify Functions

The application uses Netlify Functions for serverless backend functionality. These are automatically deployed when you deploy to Netlify.

## Step 7: Set Up a Superadmin User

After deployment, you'll need to create a superadmin user:

1. Register a new user through the application
2. Connect to your Supabase database
3. Run the following SQL to promote the user to superadmin:

```sql
INSERT INTO super_admins (id, email, first_name, last_name, status)
SELECT id, email, first_name, last_name, 'active'
FROM users
WHERE email = 'your_admin_email@example.com';
```

## Troubleshooting

### API Endpoints Not Working

- Check that your Netlify Functions are deployed correctly
- Verify environment variables are set correctly in Netlify dashboard
- Check Netlify Function logs for errors

### Authentication Issues

- Ensure Supabase URL and API keys are correct
- Check browser console for CORS errors
- Verify JWT token handling in Netlify Functions

### Database Connection Issues

- Confirm Supabase service is running
- Verify database schema is set up correctly
- Check service role key permissions

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
