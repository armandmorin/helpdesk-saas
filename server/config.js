require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/helpdesk',
  jwtSecret: process.env.JWT_SECRET || 'helpdesk_jwt_secret',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000
};
