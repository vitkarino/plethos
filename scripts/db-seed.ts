import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { projects, projectUsers, recordings, users } from '../server/db/schema.ts'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for db:seed')
}

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool)

const now = new Date()

const seededUsers = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Olena Koval',
    age: 24,
    sex: 'female',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Maksym Petrenko',
    age: 29,
    sex: 'male',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Iryna Marchuk',
    age: 32,
    sex: 'female',
  },
]

const seededProjects = [
  {
    id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    title: 'Cardio Baseline',
    description: 'Baseline signal collection for resting-state BPM',
  },
  {
    id: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    title: 'Stress Test Sessions',
    description: 'Stress-induced rhythm change tracking',
  },
]

const seededProjectUsers = [
  {
    projectId: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    userId: '11111111-1111-4111-8111-111111111111',
  },
  {
    projectId: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    userId: '22222222-2222-4222-8222-222222222222',
  },
  {
    projectId: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    userId: '33333333-3333-4333-8333-333333333333',
  },
]

const seededRecordings = [
  {
    id: 'aaaa0001-aaaa-4001-8001-aaaa00010001',
    userId: '11111111-1111-4111-8111-111111111111',
    projectId: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    startedAt: new Date(now.getTime() - 1000 * 60 * 20),
    finishedAt: new Date(now.getTime() - 1000 * 60 * 18),
    durationMs: 120000,
    status: 'extracted',
    signalType: 'ecg',
    sampleRate: 128,
    rawData: {
      provider: {
        mode: 'mock',
      },
      samples: Array.from({ length: 100 }, (_, index) => Math.sin(index * 0.1)),
      extracted: {
        bpm: 72,
        quality: 0.9,
      },
    },
  },
  {
    id: 'bbbb0002-bbbb-4002-8002-bbbb00020002',
    userId: '22222222-2222-4222-8222-222222222222',
    projectId: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    startedAt: new Date(now.getTime() - 1000 * 60 * 10),
    finishedAt: null,
    durationMs: null,
    status: 'recording',
    signalType: 'ppg',
    sampleRate: 64,
    rawData: {
      provider: {
        mode: 'mock',
      },
      samples: [],
    },
  },
  {
    id: 'cccc0003-cccc-4003-8003-cccc00030003',
    userId: '33333333-3333-4333-8333-333333333333',
    projectId: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    startedAt: new Date(now.getTime() - 1000 * 60 * 40),
    finishedAt: new Date(now.getTime() - 1000 * 60 * 35),
    durationMs: 300000,
    status: 'stopped',
    signalType: 'ecg',
    sampleRate: 256,
    rawData: {
      provider: {
        mode: 'mock',
      },
      samples: Array.from({ length: 120 }, (_, index) => Math.cos(index * 0.05)),
    },
  },
]

async function seed() {
  await db.delete(recordings)
  await db.delete(projectUsers)
  await db.delete(projects)
  await db.delete(users)

  await db.insert(users).values(seededUsers)
  await db.insert(projects).values(seededProjects)
  await db.insert(projectUsers).values(seededProjectUsers)
  await db.insert(recordings).values(seededRecordings)

  console.log('Seed completed successfully')
}

try {
  await seed()
} finally {
  await pool.end()
}
