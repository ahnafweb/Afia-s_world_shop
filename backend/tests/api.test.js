process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../server');
const db = require('../database/database');

describe('API Tests', () => {
    let token;
    let adminToken;

    before(() => {
        const passwordHash = bcrypt.hashSync('password123', 4);

        db.prepare(`
            INSERT INTO users (name, email, password_hash, role, email_verified)
            VALUES (?, ?, ?, 'user', 1)
            ON CONFLICT(email) DO UPDATE SET
                name=excluded.name,
                password_hash=excluded.password_hash,
                role='user',
                email_verified=1
        `).run('Test User', 'test@example.com', passwordHash);

        const testUser = db.prepare('SELECT id, name, email, role FROM users WHERE email=?')
            .get('test@example.com');

        const admin = db.prepare('SELECT id, name, email, role FROM users WHERE email=?')
            .get('admin@afiasworld.local');

        token = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        adminToken = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    it('should return 200 for health check', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;
    });

    it('should fetch products', async () => {
        const res = await request(app).get('/api/products');
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
    });

    it('should return 401 for authenticated routes without token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).to.equal(401);
    });

    it('should return 200 for /me with token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).to.equal(200);
        expect(res.body.email).to.equal('test@example.com');
    });

    it('should block non-admins from admin routes', async () => {
        const res = await request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).to.equal(403);
    });

    it('should allow admins to access admin routes', async () => {
        const res = await request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('revenue');
    });
});
