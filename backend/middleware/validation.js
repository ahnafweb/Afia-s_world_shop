const { body, validationResult } = require('express-validator');
const validate = (validations) => async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(422).json({ error: 'Input validation failed', details: errors.array().map(e => ({ [e.path]: e.msg })) });
};
const rules = {
    name: () => body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }).withMessage('Name is too long'),
    email: () => body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    password: () => body('password').isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters'),
    slug: () => body('slug').trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must use lowercase letters, numbers and hyphens'),
    price: () => body('price').isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
    stock: () => body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    category_id: () => body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    customer_name: () => body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
    phone: () => body('phone').trim().notEmpty().withMessage('Phone number is required'),
    address: () => body('address').trim().notEmpty().withMessage('Address is required')
};
module.exports = { validate, rules };
