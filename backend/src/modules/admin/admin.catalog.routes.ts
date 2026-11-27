import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { User, Partner, Institution, Course, Sponsor, Booking, ServiceType } from '../../models';
import { authenticate, requireRole, validate, wrap, HttpError } from '../../middleware';

// Admin: institute categories (Find Partner Institutes), editing an institution's details, and deleting a partner.
const r = Router(); r.use(authenticate, requireRole('ADMIN'));
const oid = (id: string) => { if (!isValidObjectId(id)) throw new HttpError(400, 'Invalid id'); return id; };

// ---- Categories
const typeSchema = z.object({ label: z.string().trim().min(2).max(40), icon: z.string().trim().max(8).default('✨'), order: z.coerce.number().default(0), active: z.boolean().default(true) });
const keyOf = (label: string) => label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
r.get('/service-types', wrap(async (_req, res) => {
  const items: any[] = await ServiceType.find().sort('order label').lean();
  const used: any[] = await Institution.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$type', n: { $sum: 1 } } }]);
  res.json({ items: items.map((t) => ({ ...t, institutions: used.find((u) => u._id === t.key)?.n || 0 })) });
}));
r.post('/service-types', validate(typeSchema), wrap(async (req, res) => {
  const key = keyOf(req.body.label); if (!key) throw new HttpError(400, 'Enter a name for the category');
  if (await ServiceType.exists({ key })) throw new HttpError(409, 'A category with this name already exists');
  res.status(201).json(await ServiceType.create({ ...req.body, key }));
}));
r.put('/service-types/:id', validate(typeSchema.partial()), wrap(async (req, res) => {
  const t = await ServiceType.findByIdAndUpdate(oid(req.params.id), req.body, { new: true }); if (!t) throw new HttpError(404, 'Category not found'); res.json(t);
}));
r.delete('/service-types/:id', wrap(async (req, res) => {
  const t: any = await ServiceType.findById(oid(req.params.id)); if (!t) throw new HttpError(404, 'Category not found');
  if (t.key === 'OTHER') throw new HttpError(400, 'The "Other" category is the fallback and cannot be deleted. You can hide it instead.');
  const n = await Institution.countDocuments({ type: t.key, deletedAt: null });
  if (n) throw new HttpError(409, `${n} institution(s) use this category. Move them to another category (Partners > Edit details) or hide this one instead of deleting.`);
  await t.deleteOne(); res.json({ message: 'Deleted' });
}));

// ---- Edit an institution's listing details (type, location …)
const instSchema = z.object({ name: z.string().trim().min(2).max(120), type: z.string().trim().toUpperCase().min(2).max(40), address: z.string().trim().max(300), city: z.string().trim().max(60), district: z.string().trim().max(60),
  state: z.string().trim().max(60), pin: z.string().trim().max(10), contactPhone: z.string().trim().max(20), description: z.string().max(2000) }).partial();
r.put('/partners/:id/institution', validate(instSchema), wrap(async (req, res) => {
  const p: any = await Partner.findOne({ _id: oid(req.params.id), deletedAt: null }); if (!p) throw new HttpError(404, 'Partner not found');
  if (req.body.type && !(await ServiceType.exists({ key: req.body.type }))) throw new HttpError(400, 'Unknown category');
  const inst: any = await Institution.findOneAndUpdate({ partner: p._id }, req.body, { new: true }); if (!inst) throw new HttpError(404, 'Institution not found');
  if (req.body.name) p.institutionName = req.body.name; if (req.body.type) p.institutionType = req.body.type; await p.save();
  res.json({ institution: inst });
}));

// ---- Delete a partner: hides the academy everywhere, removes its ads, and frees its mobile number and email so it can register again.
r.delete('/partners/:id', wrap(async (req, res) => {
  const p: any = await Partner.findOne({ _id: oid(req.params.id), deletedAt: null }); if (!p) throw new HttpError(404, 'Partner not found');
  const now = new Date();
  const insts: any[] = await Institution.find({ partner: p._id }).select('_id').lean(); const ids = insts.map((i) => i._id);
  await Course.updateMany({ institution: { $in: ids } }, { deletedAt: now, status: 'INACTIVE' }).catch(() => {});
  await Sponsor.deleteMany({ institution: { $in: ids } });
  await Institution.updateMany({ partner: p._id }, { deletedAt: now, active: false });
  p.deletedAt = now; await p.save();
  const u: any = await User.findById(p.user);
  if (u) { await User.updateOne({ _id: u._id }, { deletedAt: now, status: 'SUSPENDED', email: `deleted-${Date.now()}-${u.email}`, $unset: { phone: 1 } }); }
  await Booking.updateMany({ institution: { $in: ids }, status: 'PENDING_PAYMENT' }, { status: 'CANCELLED' }).catch(() => {});
  res.json({ message: 'Partner deleted' });
}));
export default r;
