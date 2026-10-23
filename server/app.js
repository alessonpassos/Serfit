import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createDatabase, safeUser } from "./database.js";
import {
  ValidationError,
  userFields,
  planFields,
  modalityFields,
  workoutFields,
} from "../shared/validation.js";
const deriveKey = promisify(scrypt);
const tokenHash = (value) => createHash("sha256").update(value).digest("hex");
const today = () => new Date().toISOString().slice(0, 10);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(password, salt, 64);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  if (typeof password !== "string" || password.length > 128 || !stored)
    return false;
  const [, salt, hash] = stored.split(":");
  const derived = await deriveKey(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    expected.length === derived.length && timingSafeEqual(expected, derived)
  );
}
const throwError = (message, status = 400) => {
  throw new ValidationError(message, status);
};
export function createApp(options = {}) {
  const db = options.db || createDatabase(options);
  const app = express();
  app.disable("x-powered-by");
  const production = process.env.NODE_ENV === "production";
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  const origins = (
    process.env.CLIENT_ORIGIN || "http://localhost:4173,http://127.0.0.1:4173"
  )
    .split(",")
    .map((x) => x.trim());
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(
    cors({
      origin(origin, cb) {
        cb(null, !origin || origins.includes(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (
        origin &&
        !origins.includes(origin) &&
        origin !== `${req.protocol}://${req.get("host")}`
      )
        return res
          .status(403)
          .json({ message: "Origem da solicitação não permitida." });
      if (!req.is("application/json"))
        return res
          .status(415)
          .json({ message: "Envie os dados no formato JSON." });
    }
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("serfit_session="))
      ?.slice(15);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const session = db
        .prepare(
          "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1",
        )
        .get(tokenHash(token), Date.now());
      req.user = safeUser(session);
      req.sessionHash = tokenHash(token);
    }
    next();
  });
  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user)
        return res
          .status(401)
          .json({ message: "Entre na sua conta para continuar." });
      if (roles.length && !roles.includes(req.user.role))
        return res
          .status(403)
          .json({ message: "Você não tem permissão para esta ação." });
      next();
    };
  }
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: production,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
  const startSession = (req, res, userId) => {
    if (req.sessionHash)
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        req.sessionHash,
      );
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    ).run(tokenHash(token), userId, Date.now() + cookieOptions.maxAge);
    res.cookie("serfit_session", token, cookieOptions);
  };
  const getUser = (id) =>
    db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const getCollection = (name) =>
    db
      .prepare(`SELECT * FROM ${name}`)
      .all()
      .map((r) => ({ ...JSON.parse(r.data), id: r.id }));
  const getPlan = (id) => {
    const row = db.prepare("SELECT * FROM plans WHERE id = ?").get(id);
    return row ? { ...JSON.parse(row.data), id: row.id } : null;
  };
  const getWorkouts = (studentId) =>
    db
      .prepare("SELECT * FROM workouts WHERE student_id = ? ORDER BY id")
      .all(studentId)
      .map((w) => ({
        ...JSON.parse(w.data),
        id: w.id,
        studentId: w.student_id,
        teacherId: w.teacher_id,
        updatedAt: w.updated_at,
      }));
  function uniqueEmail(email, id = 0) {
    if (
      db
        .prepare("SELECT id FROM users WHERE email = ? AND id <> ?")
        .get(email, id)
    )
      throwError("Este e-mail já está cadastrado.", 409);
  }
  function relations(body, target) {
    if (target.role !== "aluno")
      return { planId: null, teacherId: null, membershipStatus: null };
    const planId = Number(body.planId);
    const plan = getPlan(planId);
    if (!plan || (!plan.active && planId !== target.plan_id))
      throwError("Selecione um plano disponível.");
    const teacherId = body.teacherId ? Number(body.teacherId) : null;
    const teacher = teacherId ? getUser(teacherId) : null;
    if (
      teacherId &&
      (!teacher || teacher.role !== "professor" || !teacher.active)
    )
      throwError("Selecione um professor ativo.");
    const membershipStatus = body.membershipStatus || "Em análise";
    if (!["Ativa", "Em análise"].includes(membershipStatus))
      throwError("Situação de matrícula inválida.");
    return { planId, teacherId, membershipStatus };
  }
  function checkStudent(req, write = false) {
    const id = Number(req.params.studentId);
    const student = getUser(id);
    if (!student || student.role !== "aluno")
      throwError("Aluno não encontrado.", 404);
    const me = req.user;
    const permitted = write
      ? me.role === "professor" && student.teacher_id === me.id
      : me.role === "gerente" ||
        (me.role === "professor" && student.teacher_id === me.id) ||
        (me.role === "aluno" && me.id === id);
    if (!permitted)
      throwError("Você não tem permissão para acessar este aluno.", 403);
    return id;
  }
  app.get("/api/health", (req, res) =>
    res.json({ status: "ok", service: "SerFit API" }),
  );
  app.get("/api/catalog", (req, res) =>
    res.json({
      plans: getCollection("plans").filter((p) => p.active),
      modalities: getCollection("modalities").filter((m) => m.active),
    }),
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      message:
        "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
    },
  });
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    const valid = await verifyPassword(req.body?.password, user?.password_hash);
    if (!user?.active || !valid) throwError("E-mail ou senha inválidos.", 401);
    startSession(req, res, user.id);
    res.json(safeUser(user));
  });
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { password, ...fields } = userFields(req.body, { register: true });
    uniqueEmail(fields.email);
    const planId = Number(req.body.planId);
    if (!getPlan(planId)?.active) throwError("Selecione um plano disponível.");
    const hash = await hashPassword(password);
    // Recheck after the asynchronous password derivation to prevent races.
    uniqueEmail(fields.email);
    const insert = db
      .prepare(
        "INSERT INTO users(name,email,phone,password_hash,role,active,plan_id,membership_status,joined_at) VALUES (?,?,?,?,'aluno',1,?,'Em análise',?)",
      )
      .run(fields.name, fields.email, fields.phone, hash, planId, today());
    const id = Number(insert.lastInsertRowid);
    startSession(req, res, id);
    res.status(201).json(safeUser(getUser(id)));
  });
  app.post("/api/auth/logout", (req, res) => {
    if (req.sessionHash)
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        req.sessionHash,
      );
    res.clearCookie("serfit_session", { ...cookieOptions, maxAge: undefined });
    res.json({ message: "Você saiu da sua conta." });
  });
  app.get("/api/auth/me", requireRole(), (req, res) => res.json(req.user));
  app.patch("/api/me", requireRole(), (req, res) => {
    const { name, email, phone } = userFields(req.body);
    uniqueEmail(email, req.user.id);
    db.prepare(
      "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
    ).run(name, email, phone, req.user.id);
    res.json(safeUser(getUser(req.user.id)));
  });
  app.get("/api/me/dashboard", requireRole("aluno"), (req, res) =>
    res.json({
      user: req.user,
      plan: getPlan(req.user.planId),
      teacher: safeUser(getUser(req.user.teacherId)),
      workouts: getWorkouts(req.user.id),
    }),
  );
  app.get("/api/teacher/students", requireRole("professor"), (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT * FROM users WHERE role = 'aluno' AND teacher_id = ? ORDER BY name",
        )
        .all(req.user.id)
        .map((u) => ({
          ...safeUser(u),
          planName: getPlan(u.plan_id)?.name,
          workoutCount: db
            .prepare(
              "SELECT count(*) as total FROM workouts WHERE student_id = ?",
            )
            .get(u.id).total,
        })),
    ),
  );
  app.get("/api/students/:studentId/workouts", requireRole(), (req, res) =>
    res.json(getWorkouts(checkStudent(req))),
  );
  app.post(
    "/api/students/:studentId/workouts",
    requireRole("professor"),
    (req, res) => {
      const studentId = checkStudent(req, true);
      const data = workoutFields(req.body);
      const row = db
        .prepare(
          "INSERT INTO workouts(student_id, teacher_id, data, updated_at) VALUES (?, ?, ?, ?)",
        )
        .run(studentId, req.user.id, JSON.stringify(data), today());
      res
        .status(201)
        .json({
          ...data,
          id: Number(row.lastInsertRowid),
          studentId,
          teacherId: req.user.id,
          updatedAt: today(),
        });
    },
  );
  app.patch(
    "/api/students/:studentId/workouts/:id",
    requireRole("professor"),
    (req, res) => {
      const studentId = checkStudent(req, true);
      const id = Number(req.params.id);
      const data = workoutFields(req.body);
      const changes = db
        .prepare(
          "UPDATE workouts SET data = ?, teacher_id = ?, updated_at = ? WHERE id = ? AND student_id = ?",
        )
        .run(JSON.stringify(data), req.user.id, today(), id, studentId).changes;
      if (!changes) throwError("Treino não encontrado.", 404);
      res.json({
        ...data,
        id,
        studentId,
        teacherId: req.user.id,
        updatedAt: today(),
      });
    },
  );
  app.use("/api/admin", requireRole("gerente"));
  app.get("/api/admin/users", (req, res) =>
    res.json(db.prepare("SELECT * FROM users ORDER BY id").all().map(safeUser)),
  );
  app.post("/api/admin/users", async (req, res) => {
    const { password, ...fields } = userFields(req.body, { register: true });
    uniqueEmail(fields.email);
    const role = req.body.role;
    if (!["aluno", "professor"].includes(role))
      throwError("Selecione o perfil aluno ou professor.");
    const rel = relations(req.body, { role });
    const hash = await hashPassword(password);
    uniqueEmail(fields.email);
    const row = db
      .prepare(
        "INSERT INTO users(name,email,phone,password_hash,role,active,plan_id,teacher_id,membership_status,joined_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        fields.name,
        fields.email,
        fields.phone,
        hash,
        role,
        Number(req.body.active !== false),
        rel.planId,
        rel.teacherId,
        rel.membershipStatus,
        today(),
      );
    res.status(201).json(safeUser(getUser(Number(row.lastInsertRowid))));
  });
  app.patch("/api/admin/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    const target = getUser(id);
    if (!target) throwError("Usuário não encontrado.", 404);
    if (target.role === "gerente")
      throwError(
        "Use Meu perfil para atualizar sua conta. A gestão de gerentes não está habilitada.",
        403,
      );
    const fields = userFields(req.body);
    uniqueEmail(fields.email, id);
    const rel = relations(req.body, target);
    const active = req.body.active !== false;
    if (
      target.role === "professor" &&
      !active &&
      db
        .prepare(
          "SELECT id FROM users WHERE teacher_id = ? AND active = 1 LIMIT 1",
        )
        .get(id)
    )
      throwError("Reatribua os alunos antes de inativar este professor.");
    const passwordHash = fields.password
      ? await hashPassword(fields.password)
      : target.password_hash;
    db.exec("BEGIN");
    try {
      uniqueEmail(fields.email, id);
      db.prepare(
        "UPDATE users SET name=?,email=?,phone=?,password_hash=?,active=?,plan_id=?,teacher_id=?,membership_status=? WHERE id=?",
      ).run(
        fields.name,
        fields.email,
        fields.phone,
        passwordHash,
        Number(active),
        rel.planId,
        rel.teacherId,
        rel.membershipStatus,
        id,
      );
      if (target.role === "aluno" && target.teacher_id !== rel.teacherId)
        db.prepare(
          "UPDATE workouts SET teacher_id = ? WHERE student_id = ?",
        ).run(rel.teacherId, id);
      if (!active || fields.password)
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    res.json(safeUser(getUser(id)));
  });
  for (const [collection, validate] of [
    ["plans", planFields],
    ["modalities", modalityFields],
  ]) {
    app.get(`/api/admin/${collection}`, (req, res) =>
      res.json(getCollection(collection)),
    );
    app.post(`/api/admin/${collection}`, (req, res) => {
      const data = validate(req.body);
      const row = db
        .prepare(`INSERT INTO ${collection}(data) VALUES (?)`)
        .run(JSON.stringify(data));
      res.status(201).json({ ...data, id: Number(row.lastInsertRowid) });
    });
    app.patch(`/api/admin/${collection}/:id`, (req, res) => {
      const data = validate(req.body);
      const id = Number(req.params.id);
      const changes = db
        .prepare(`UPDATE ${collection} SET data = ? WHERE id = ?`)
        .run(JSON.stringify(data), id).changes;
      if (!changes) throwError("Registro não encontrado.", 404);
      res.json({ ...data, id });
    });
  }
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "Recurso não encontrado." }),
  );
  const web = resolve(options.distPath || "./dist");
  if (existsSync(resolve(web, "index.html"))) {
    app.use(express.static(web));
    app.get(/.*/, (req, res) => res.sendFile(resolve(web, "index.html")));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status || (String(error.code).includes("CONSTRAINT") ? 409 : 500);
    if (status >= 500) console.error("SerFit API:", error.message);
    const message =
      status >= 500
        ? "Não foi possível concluir a operação. Tente novamente."
        : String(error.code).includes("CONSTRAINT")
          ? "Os dados informados entram em conflito com um registro existente."
          : error.type === "entity.parse.failed"
            ? "O JSON enviado é inválido."
            : error.message;
    res.status(status).json({ message });
  });
  return { app, db };
}
