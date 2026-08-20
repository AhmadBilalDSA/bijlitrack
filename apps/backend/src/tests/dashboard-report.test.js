import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index.js';
import { Reference } from '../models/Reference.js';
import { User } from '../models/User.js';

describe('Dashboard report API', () => {
  let mongoServer;
  let originalJwtSecret;
  let originalGroqApiKey;

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    originalGroqApiKey = process.env.GROQ_API_KEY;
    process.env.JWT_SECRET = 'test-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 30000);

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }

    if (originalGroqApiKey) {
      process.env.GROQ_API_KEY = originalGroqApiKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  });

  afterAll(async () => {
    if (originalJwtSecret) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }

    await mongoose.disconnect();
    await mongoServer.stop();
  }, 30000);

  const createUserReferenceAndToken = async () => {
    const user = await User.create({
      name: 'Report User',
      email: 'report@example.com',
      passwordHash: 'password123',
    });

    const reference = await Reference.create({
      userId: user._id,
      referenceNo: '12345678901234',
      referenceNoLast4: '1234',
      consentGivenAt: new Date(),
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return { reference, token };
  };

  it('returns a clear service error when Groq is not configured', async () => {
    delete process.env.GROQ_API_KEY;
    const { reference, token } = await createUserReferenceAndToken();

    const res = await request(app)
      .post(`/api/dashboard/${reference._id}/report/generate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/GROQ_API_KEY/i);
  });
});
