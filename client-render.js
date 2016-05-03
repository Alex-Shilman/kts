import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router';

import { routes } from './routes';

import createBrowserHistory from 'history/lib/createBrowserHistory';

import './styles/scss/style.scss';
import 'react-flexgrid/lib/flexgrid.css';
import 'bootstrap/less/bootstrap.less';
import 'react-select2-wrapper/css/select2.css';

ReactDOM.render(
  <Router routes={routes} history={createBrowserHistory()} />,
  document.getElementById('app')
);
