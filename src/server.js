import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import favicon from 'serve-favicon';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectMongo from 'connect-mongo';
import mongoose from 'mongoose';
import passport from 'passport';
import csrf from 'csurf';
import React from 'react';
import log4js from 'log4js';
import CustomStrategy from './util/passport/strategy-local';

import api from './api';
import schema from './schema';
import DataWrapper from './datawrapper';
import webpack from 'webpack';
import webpackConfig from '../webpack.config';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import multer  from 'multer';

// determine environment type
const nodeEnv = process.env.NODE_ENV || 'development';

// app configuration
const config = require('./config').default;
const PORT = config.port;

// configure storage for photos
const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (!req.user || !req.user._id) {
      cb('User not found');
    } else {
      const userdir = path.join(config.workingDir, 'uploads/', req.params.nameslug + '_img');
      fs.mkdir(userdir, function (err) { // returns with error if already exists
        cb(null, userdir);
      });
    }
  }
});
const upload = multer({ storage });

// initialize the express app
const app = express();

// postgresql connection
// const db = new Sequelize('postgres://kts:kts@localhost/kts');
mongoose.connect('mongodb://localhost/kts');

// passpost strategy
const LocalStrategy = require('passport-local').Strategy;

// logger configuration
log4js.configure('./src/config/log4js.json');
const logger = log4js.getLogger();

const mongoStore = connectMongo(session);
const sessionConfig = {
  // according to https://github.com/expressjs/session#resave
  // see "How do I know if this is necessary for my store?"
  resave: true,
  saveUninitialized: true,
  secret: config.cryptoKey,
  store: new mongoStore({ url: config.mongodb.uri }),
  cookie: {}
};

if (nodeEnv === 'development') {
  const compiler = webpack(webpackConfig);
  app.use(webpackDevMiddleware(compiler, {
    // Dev middleware can't access config, so we provide publicPath
    publicPath: webpackConfig.output.publicPath,

    // pretty colored output
    stats: { colors: true }
  }));

  app.use(webpackHotMiddleware(compiler));
}

app.use(express.static(path.join(__dirname, 'dist')));
app.use('/static', express.static(path.join(__dirname, '../uploads')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(config.cryptoKey));

if (nodeEnv === 'prod') {
  app.set('trust proxy', 1);
  // https://github.com/expressjs/session/issues/251
  sessionConfig.cookie.secure = false;
  logger.info('using secure cookies');
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf({
  cookie: {
    signed: true
  },
  value(req) {
    const csrf = req.cookies._csrfToken;
    return csrf;
  }
}));

// response locals
app.use(function (req, res, next) {
  res.cookie('_csrfToken', req.csrfToken());
  res.locals.user = {};
  res.locals.user.defaultReturnUrl = '/';
  res.locals.user.username = req.user && req.user.username;
  next();
});

app.use(function (req, res, next) {
  GLOBAL.navigator = {
    userAgent: req.headers['user-agent']
  };
  next();
});

// global locals
app.locals.projectName = config.projectName;
app.locals.copyrightYear = new Date().getFullYear();
app.locals.copyrightName = config.companyName;
app.locals.cacheBreaker = 'br34k-01';

app.set('view engine', 'ejs');

let localStragety = new CustomStrategy();

// passport setup
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'passw'
}, localStragety.authenticate));

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (_id, done) {
  if (mongoose.Types.ObjectId.isValid(_id)) {
    mongoose.model('User').findById(_id, function (err, user) {
      if (err) {
        done(err, null);
      }
      if (user) {
        done(null, localStragety.filterUser(user.toJSON()));
      }
    });
  } else {
    done('Invalid authentication request', null);
  }
});

api(app, upload);
// /* non-react routes */
// app.post('/api/register', api.register);
// app.post('/api/activate', api.activate);
// app.post('/api/login', api.signin);
// app.post('/api/logout', api.signout);
// app.get('/api/profile', api.profile);

// app.post('/api/pages', api.createPage);
// app.get('/api/pages', api.getPages);
// app.get('/api/pages/:nameslug', api.findPage);
// app.get('/api/pages/:nameslug/photos', api.getPhotos);
// app.post('/api/pages/:nameslug/photos', upload.single('file'), api.uploadPhoto);
// app.delete('/api/pages/:nameslug/photos/:photoid', api.deletePhoto);

// /* main router for reactjs components, supporting both client and server side rendering*/
// let sendHtml = function (res, props, context) {
//   const markup = renderToString(<RoutingContext {...props} params={{ context }}/>);
//   res.send(`
//   <!DOCTYPE html>
//   <html>
//     <head>
//       <title>KTS</title>
//       <link href='https://fonts.googleapis.com/css?family=Roboto:400,300,500' rel='stylesheet' type='text/css'>
//     </head>
//     <script>
//       window.APP_STATE = '${context}';
//     </script>
//     <body>
//       <div id="app">${markup}</div>
//       <script src="/dist/bundle.js"></script>
//     </body>
//   </html>
//   `);
// };

// app.get('*', (req, res, next) => {
//   match({ routes, location: req.url }, (err, redirectLocation, props) => {
//     if (err) {
//       res.status(500).send(err.message);
//     } else if (redirectLocation) {
//       res.redirect(302, redirectLocation.pathname + redirectLocation.search);
//     } else if (props) {
//       let context = '';

//       if (props.params.nameslug) {
//         api._findPage(props.params.nameslug, logger, function (err, doc) {
//           context = JSON.stringify(doc);
//           sendHtml(res, props, context);
//         });
//       } else {
//         sendHtml(res, props, context);
//       }

//     } else {
//       res.sendStatus(404);
//     }
//   });
// });

// app-wide stuff
app.logger = logger;
app.config = config;

const server = http.createServer(app);

server.listen(PORT);
server.on('listening', () => {
  logger.info('Listening on', PORT);
});
