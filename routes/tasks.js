const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');

const router = express.Router();

const safeParseJSON = (raw, fallback = {}) => { if (raw == null) return fallback; try { return JSON.parse(raw); } catch { return fallback; } };
const asInt = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const sendOk = (res, data) => res.status(200).json({ message: 'OK', data });
const sendCreated = (res, data) => res.status(201).json({ message: 'Created', data });
const sendBad = (res, msg) => res.status(400).json({ message: msg, data: null });
const sendNotFound = (res, msg = 'Not found') => res.status(404).json({ message: msg, data: null });
const sendServerErr = (res, msg = 'Server error') => res.status(500).json({ message: msg, data: null });

router.get('/', async (req, res) => {
  try {
    const where = safeParseJSON(req.query.where, {});
    const sort = safeParseJSON(req.query.sort, null);
    const select = safeParseJSON(req.query.select, null);
    const skip = asInt(req.query.skip, 0);
    const limit = asInt(req.query.limit, 100);
    const count = req.query.count === 'true';
    if (count) return sendOk(res, await Task.countDocuments(where));
    let q = Task.find(where);
    if (sort) q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip) q = q.skip(skip);
    if (limit) q = q.limit(limit);
    return sendOk(res, await q.exec());
  } catch { return sendServerErr(res); }
});

router.get('/:id', async (req, res) => {
  try {
    const select = safeParseJSON(req.query.select, null);
    const doc = await Task.findById(req.params.id).select(select || undefined);
    if (!doc) return sendNotFound(res);
    return sendOk(res, doc);
  } catch { return sendServerErr(res); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, deadline, completed, assignedUser, assignedUserName } = req.body;
    if (!name || !deadline) return sendBad(res, 'Name and deadline are required');
    const task = new Task({
      name: String(name).trim(),
      description: description || '',
      deadline: new Date(deadline),
      completed: !!completed,
      assignedUser: assignedUser || '',
      assignedUserName: assignedUser ? (assignedUserName || 'unassigned') : 'unassigned'
    });
    if (task.assignedUser) {
        const u = await User.findById(task.assignedUser);
        if (u) {
          task.assignedUserName = u.name;
        } else {
          task.assignedUser = '';
          task.assignedUserName = 'unassigned';
        }
    }      
    await task.save();
    if (task.assignedUser) {
      await User.updateOne({ _id: task.assignedUser }, { $addToSet: { pendingTasks: String(task._id) } });
    }
    return sendCreated(res, task);
  } catch { return sendServerErr(res); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, deadline, completed, assignedUser, assignedUserName } = req.body;
    if (!name || !deadline) return sendBad(res, 'Name and deadline are required');
    const task = await Task.findById(req.params.id);
    if (!task) return sendNotFound(res);

    const prevUser = task.assignedUser || '';
    let nextUser = assignedUser || '';
    let nextUserName = assignedUserName || 'unassigned';
    if (nextUser) {
      const u = await User.findById(nextUser);
      if (!u) return sendBad(res, 'assignedUser not found');
      nextUserName = u.name;
    }

    task.name = String(name).trim();
    task.description = description || '';
    task.deadline = new Date(deadline);
    task.completed = !!completed;
    task.assignedUser = nextUser;
    task.assignedUserName = nextUser ? nextUserName : 'unassigned';
    await task.save();

    if (String(prevUser) !== String(nextUser)) {
      if (prevUser) await User.updateOne({ _id: prevUser }, { $pull: { pendingTasks: String(task._id) } });
      if (nextUser) await User.updateOne({ _id: nextUser }, { $addToSet: { pendingTasks: String(task._id) } });
    }
    return sendOk(res, task);
  } catch { return sendServerErr(res); }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return sendNotFound(res);
    if (task.assignedUser) {
      await User.updateOne({ _id: task.assignedUser }, { $pull: { pendingTasks: String(task._id) } });
    }
    await task.deleteOne();
    return sendOk(res, null);
  } catch { return sendServerErr(res); }
});

module.exports = router;
