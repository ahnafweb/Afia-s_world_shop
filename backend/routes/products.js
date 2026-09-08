const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../database/database');
const { authRequired, adminRequired } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validation');
const router = express.Router();

// Always store uploads relative to this file, not the terminal's current folder.
// This fixes uploads failing when `npm start` is launched from a different directory.
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext) ? ext : '.jpg';
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        cb(null, `${unique}${safeExt}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed (JPG, PNG, WEBP, GIF, AVIF).'));
    }
});

const productRules = [rules.name(), rules.slug(), rules.category_id(), rules.price(), rules.stock()];

router.get('/', (req, res) => {
    let sql = `SELECT p.*, c.name AS category, c.slug AS category_slug FROM products p JOIN categories c ON c.id = p.category_id`;
    const where = [], args = [];
    if (req.query.category) { where.push('(c.slug = ? OR c.name = ?)'); args.push(req.query.category, req.query.category); }
    if (req.query.featured === 'true') where.push('p.featured = 1');
    if (req.query.q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY p.id DESC';
    try { res.json(db.prepare(sql).all(...args)); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Could not load products' }); }
});

router.get('/:id', (req, res) => {
    try {
        const product = db.prepare(`SELECT p.*, c.name AS category, c.slug AS category_slug FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=? OR p.slug=?`).get(req.params.id, req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) { res.status(500).json({ error: 'Could not load product' }); }
});

router.post('/', authRequired, adminRequired, upload.single('image'), validate(productRules), (req, res) => {
    const { name, slug, description = '', category_id, price, stock = 0, featured = 0 } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    try {
        const result = db.prepare(`INSERT INTO products(name,slug,description,category_id,price,stock,image,featured) VALUES(?,?,?,?,?,?,?,?)`)
            .run(name.trim(), slug.trim().toLowerCase(), description.trim(), Number(category_id), Number(price), Number(stock), image, String(featured) === '1' ? 1 : 0);
        res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid));
    } catch (err) {
        // Remove an uploaded file if the database insert fails.
        if (req.file) fs.rm(req.file.path, { force: true }, () => {});
        res.status(400).json({ error: err.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Product slug already exists' : err.message });
    }
});

router.put('/:id', authRequired, adminRequired, upload.single('image'), validate(productRules), (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    if (!product) {
        if (req.file) fs.rm(req.file.path, { force: true }, () => {});
        return res.status(404).json({ error: 'Product not found' });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : product.image;
    const p = { ...product, ...req.body };

    try {
        db.prepare(`UPDATE products SET name=?,slug=?,description=?,category_id=?,price=?,stock=?,image=?,featured=? WHERE id=?`)
            .run(p.name.trim(), p.slug.trim().toLowerCase(), (p.description || '').trim(), Number(p.category_id), Number(p.price), Number(p.stock), image, String(p.featured) === '1' ? 1 : 0, req.params.id);

        // If a new image replaced an old local image, clean up the old file.
        if (req.file && product.image && product.image.startsWith('/uploads/')) {
            const oldFile = path.join(uploadDir, path.basename(product.image));
            fs.rm(oldFile, { force: true }, () => {});
        }

        res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
    } catch (err) {
        if (req.file) fs.rm(req.file.path, { force: true }, () => {});
        res.status(400).json({ error: err.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Product slug already exists' : err.message });
    }
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
    try {
        const product = db.prepare('SELECT image FROM products WHERE id=?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        const result = db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
        if (product.image && product.image.startsWith('/uploads/')) {
            fs.rm(path.join(uploadDir, path.basename(product.image)), { force: true }, () => {});
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) { res.status(409).json({ error: 'Product cannot be deleted because it is used by an order' }); }
});

module.exports = router;
