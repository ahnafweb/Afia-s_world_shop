const express = require('express');
const db = require('../database/database');
const { authRequired } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validation');

const router = express.Router();

// Helper to retrieve order with its items
function getOrder(id, userId) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, userId);
    if (order) {
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    }
    return order;
}

// POST /api/orders - Create a new order
router.post('/', authRequired, validate([
    rules.customer_name(),
    rules.phone(),
    rules.address()
]), (req, res) => {
    const { items, customer_name, phone, address, notes = '' } = req.body;

    if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: 'Items are required' });
    }

    try {
        const orderId = db.transaction(() => {
            let total = 0;
            const lineItems = [];
            const requested = new Map();
            for (const item of items) requested.set(Number(item.product_id), (requested.get(Number(item.product_id)) || 0) + Number(item.quantity));

            for (const item of requested.entries()) {
                const [productId, quantity] = item;
                const product = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?').get(productId);

                if (!product) throw new Error('Product not found');
                if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Invalid quantity');
                if (product.stock < quantity) throw new Error(`${product.name} is out of stock`);

                total += product.price * quantity;
                lineItems.push({ product, quantity });
            }

            const orderResult = db.prepare(`
                INSERT INTO orders (user_id, status, total, customer_name, phone, address, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(req.user.id, 'pending', total, customer_name, phone, address, notes);

            const insertItem = db.prepare(`
                INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
                VALUES (?, ?, ?, ?, ?)
            `);
            const decrementStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');

            lineItems.forEach(({ product, quantity }) => {
                insertItem.run(orderResult.lastInsertRowid, product.id, product.name, product.price, quantity);
                const changed = decrementStock.run(quantity, product.id, quantity);
                if (!changed.changes) throw new Error(`${product.name} is out of stock`);
            });

            return orderResult.lastInsertRowid;
        })();

        res.status(201).json(getOrder(orderId, req.user.id));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/orders - List all orders for current user
router.get('/', authRequired, (req, res) => {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    orders.forEach(order => {
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    });
    res.json(orders);
});

// GET /api/orders/:id - Get single order for current user
router.get('/:id', authRequired, (req, res) => {
    const order = getOrder(req.params.id, req.user.id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
});

module.exports = router;
