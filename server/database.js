import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import {
  initialPlans,
  initialModalities,
  initialUsers,
  initialWorkouts,
} from "../shared/seed.js";
export function hashPasswordSync(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function safeUser(row) {
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        active: Boolean(row.active),
        planId: row.plan_id,
        teacherId: row.teacher_id,
        membershipStatus: row.membership_status,
        joinedAt: row.joined_at,
      }
    : null;
}
export function createDatabase({
  path = process.env.DATABASE_PATH || "./server/data/serfit.sqlite",
  seed = process.env.SEED_DEMO === "true",
  password = process.env.DEMO_PASSWORD || "SerFit2026!",
  adminEmail = process.env.ADMIN_EMAIL,
  adminPassword = process.env.ADMIN_PASSWORD,
} = {}) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS modalities (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('aluno','professor','gerente')),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), plan_id INTEGER REFERENCES plans(id),
      teacher_id INTEGER REFERENCES users(id), membership_status TEXT CHECK(membership_status IN ('Ativa','Em análise')),
      joined_at TEXT NOT NULL, CHECK(role <> 'aluno' OR (plan_id IS NOT NULL AND membership_status IS NOT NULL))
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL REFERENCES users(id),
      teacher_id INTEGER REFERENCES users(id), data TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_students_teacher ON users(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_student ON workouts(student_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    PRAGMA optimize;
  `);
  const putPlan = db.prepare("INSERT INTO plans(id, data) VALUES (?, ?)");
  const putModality = db.prepare(
    "INSERT INTO modalities(id, data) VALUES (?, ?)",
  );
  if (!db.prepare("SELECT id FROM plans LIMIT 1").get())
    initialPlans.forEach(({ id, ...data }) =>
      putPlan.run(id, JSON.stringify(data)),
    );
  if (!db.prepare("SELECT id FROM modalities LIMIT 1").get())
    initialModalities.forEach(({ id, ...data }) =>
      putModality.run(id, JSON.stringify(data)),
    );
  const putUser = db.prepare(
    "INSERT INTO users(id, name, email, phone, password_hash, role, active, plan_id, teacher_id, membership_status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  if (!db.prepare("SELECT id FROM users LIMIT 1").get()) {
    if (seed) {
      initialUsers.forEach((u) =>
        putUser.run(
          u.id,
          u.name,
          u.email,
          u.phone,
          hashPasswordSync(password),
          u.role,
          Number(u.active),
          u.planId,
          u.teacherId,
          u.membershipStatus,
          u.joinedAt,
        ),
      );
      const stmt = db.prepare(
        "INSERT INTO workouts(id, student_id, teacher_id, data, updated_at) VALUES (?, ?, ?, ?, ?)",
      );
      initialWorkouts.forEach(
        ({ id, studentId, teacherId, updatedAt, ...data }) =>
          stmt.run(id, studentId, teacherId, JSON.stringify(data), updatedAt),
      );
    } else if (adminEmail && adminPassword?.length >= 8) {
      putUser.run(
        1,
        process.env.ADMIN_NAME || "Gerente SerFit",
        adminEmail.trim().toLowerCase(),
        "",
        hashPasswordSync(adminPassword),
        "gerente",
        1,
        null,
        null,
        null,
        new Date().toISOString().slice(0, 10),
      );
    } else {
      db.close();
      throw new Error(
        "Banco novo: configure SEED_DEMO=true para desenvolvimento ou ADMIN_EMAIL e ADMIN_PASSWORD para criar o gerente.",
      );
    }
  }
  return db;
}

