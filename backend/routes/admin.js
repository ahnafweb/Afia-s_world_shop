const express = require('express');
const db = require('../database/database');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authRequired, adminRequired);

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', (req, res) => {
    try {
        const products = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
        const revenue = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'").get().total;

        res.json({
            products,
            users,
            orders,
            revenue
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/orders - List all orders with user emails
router.get('/orders', (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT o.*, u.email as user_email
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.id DESC
        `).all();

        orders.forEach(order => {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        });

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status', (req, res) => {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    try {
        const update = db.transaction(() => {
            const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(req.params.id);
            if (!order) return false;
            if (order.status === req.body.status) return true;

            const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
            const adjustStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');

            if (req.body.status === 'cancelled' && order.status !== 'cancelled') {
                for (const item of items) adjustStock.run(item.quantity, item.product_id);
            } else if (req.body.status !== 'cancelled' && order.status === 'cancelled') {
                for (const item of items) {
                    const result = reduceStock.run(item.quantity, item.product_id, item.quantity);
                    if (!result.changes) throw new Error('Insufficient stock to restore this order');
                }
            }

            db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, order.id);
            return true;
        })();

        if (!update) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order status updated successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
