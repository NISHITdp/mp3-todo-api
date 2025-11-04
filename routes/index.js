const express = require('express');

const usersRouter = require('./users');
const tasksRouter = require('./tasks');

module.exports = (app /*, router not needed */) => {
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ message: 'OK', data: { status: 'up' } });
  });

  app.use('/api/users', usersRouter);
  app.use('/api/tasks', tasksRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Not found', data: null });
  });
};
