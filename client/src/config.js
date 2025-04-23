require('dotenv').config();

module.exports = {
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
};
