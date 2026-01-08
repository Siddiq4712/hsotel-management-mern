const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google Gmail:', profile.emails[0].value);

    // Step 1: Look for existing user by Google ID
    let user = await User.findOne({ where: { google_id: profile.id } });

    if (!user) {
      // Step 2: Look for existing user by email (Gmail)
      user = await User.findOne({ where: { email: profile.emails[0].value, is_active: true } });

      if (user) {
        // Extract profile photo URL from Google profile
        const profilePicture = profile.photos && profile.photos.length > 0 
          ? profile.photos[0].value 
          : null;

        // Link Google account and update profile picture if available
        await user.update({ 
          google_id: profile.id,
          // Update profile picture only if user doesn't have one already
          profile_picture: user.profile_picture || profilePicture
        });
      }
    }

    if (!user) {
      // Reject if email is not registered
      return done(null, false, { message: 'Access denied. Your account is not registered in the system.' });
    }

    // Add the profile picture to user object for the callback
    if (!user.profile_picture && profile.photos && profile.photos.length > 0) {
      user.dataValues.profile_picture = profile.photos[0].value;
    }

    return done(null, user);
  } catch (error) {
    console.error('Google OAuth Error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
