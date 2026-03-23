require('dotenv').config({ path: '../.env' });
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

require('./routes/auth'); // initialize passport strategy

const authRouter = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const gmailRouter = require('./routes/gmail');

const app = express();
app.set('trust proxy', 1);
```

Commit both changes on GitHub. While Railway redeploys, also make sure `CLIENT_URL` is set in your Railway server variables:
```
CLIENT_URL=https://carefree-essence-production.up.railway.app

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/gmail', gmailRouter);

app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
