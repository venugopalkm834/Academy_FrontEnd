import { Router } from 'express';
import { Notification } from '../../models';
import { authenticate, wrap } from '../../middleware';

// In-app notifications for every role (the bell icon)
const r = Router(); r.use(authenticate);
r.get('/', wrap(async (req, res) => {
  const [items, unread] = await Promise.all([Notification.find({ user: req.user!.id }).sort('-createdAt').limit(30).lean(), Notification.countDocuments({ user: req.user!.id, read: false })]);
  res.json({ items, unread });
}));
r.put('/read-all', wrap(async (req, res) => { await Notification.updateMany({ user: req.user!.id, read: false }, { read: true }); res.json({ ok: true }); }));
r.put('/:id/read', wrap(async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user!.id }, { read: true }); res.json({ ok: true }); }));
export default r;
