import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { createDatabase } from "../server/database.js";
const password = "SerFit2026!";
async function fixture(t, options = {}) {
  const { app, db } = createApp({ path: ":memory:", seed: true, ...options });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  function client() {
    let cookie = "";
    return async (path, method = "GET", body, headers = {}) => {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return {
        status: response.status,
        data: await response.json(),
        cookie: setCookie,
      };
    };
  }
  return { db, client };
}
async function login(client, role) {
  const result = await client("/auth/login", "POST", {
    email: `${role}@serfit.com`,
    password,
  });
  assert.equal(result.status, 200);
  return result;
}
test("Catálogo público reflete os planos e valores fornecidos", async (t) => {
  const { client } = await fixture(t);
  const result = await client()("/catalog");
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.data.plans.map((p) => p.price),
    [89, 100, 110, 150],
  );
  assert.deepEqual(
    result.data.modalities.map((m) => m.name),
    ["Musculação", "Karatê", "Boxe", "Zumba", "Jump"],
  );
});
test("Login usa cookie protegido e não expõe senha ou token armazenado", async (t) => {
  const { client, db } = await fixture(t);
  const api = client();
  const result = await login(api, "aluno");
  assert.match(result.cookie, /HttpOnly/i);
  assert.match(result.cookie, /SameSite=Strict/i);
  assert.equal(result.data.password_hash, undefined);
  assert.match(
    db.prepare("SELECT password_hash FROM users WHERE id = 3").get()
      .password_hash,
    /^scrypt:/,
  );
  const session = db.prepare("SELECT token_hash FROM sessions").get();
  assert.notEqual(session.token_hash, result.cookie.split(";")[0].slice(15));
  assert.equal((await api("/auth/me")).data.id, 3);
  assert.equal((await api("/auth/logout", "POST", {})).status, 200);
  assert.equal((await api("/auth/me")).status, 401);
});
test("Autorização bloqueia visitantes e perfis indevidos no servidor", async (t) => {
  const { client } = await fixture(t);
  const visitor = client();
  assert.equal((await visitor("/admin/users")).status, 401);
  const student = client();
  await login(student, "aluno");
  assert.equal((await student("/admin/users")).status, 403);
  assert.equal((await student("/teacher/students")).status, 403);
  assert.equal((await student("/students/4/workouts")).status, 403);
  const teacher = client();
  await login(teacher, "professor");
  assert.equal((await teacher("/admin/plans")).status, 403);
  const manager = client();
  await login(manager, "gerente");
  assert.equal((await manager("/students/3/workouts", "POST", {})).status, 403);
});
test("Cadastro valida campos, impede duplicidade e cria matrícula em análise", async (t) => {
  const { client } = await fixture(t);
  const api = client();
  assert.equal(
    (
      await api("/auth/register", "POST", {
        name: "A",
        email: "invalid",
        password: "short",
        planId: 1,
      })
    ).status,
    400,
  );
  const body = {
    name: "Novo Aluno",
    email: "novo@exemplo.com",
    phone: "(11) 99999-9999",
    password: "UmaSenha123!",
    planId: 2,
    role: "gerente",
  };
  const result = await api("/auth/register", "POST", body);
  assert.equal(result.status, 201);
  assert.equal(result.data.role, "aluno");
  assert.equal(result.data.planId, 2);
  assert.equal(result.data.membershipStatus, "Em análise");
  assert.equal((await api("/auth/register", "POST", body)).status, 409);
  assert.equal((await api("/me/dashboard")).data.workouts.length, 0);
});
test("Professor só acessa alunos atribuídos; alterações de treino são vistas pelo aluno", async (t) => {
  const { client } = await fixture(t);
  const teacher = client();
  const manager = client();
  const student = client();
  await login(teacher, "professor");
  await login(manager, "gerente");
  await login(student, "aluno");
  const newStudent = await manager("/admin/users", "POST", {
    name: "Outro Aluno",
    email: "outro@exemplo.com",
    password: "UmaSenha123!",
    role: "aluno",
    planId: 1,
    teacherId: null,
    membershipStatus: "Ativa",
    active: true,
  });
  assert.equal(newStudent.status, 201);
  assert.equal(
    (await teacher(`/students/${newStudent.data.id}/workouts`)).status,
    403,
  );
  const old = (await teacher("/students/3/workouts")).data[0];
  const edit = {
    ...old,
    focus: "Força e técnica",
    exercises: [
      { name: "Agachamento", sets: 4, reps: "10", load: "25 kg", rest: "90 s" },
    ],
  };
  assert.equal(
    (await teacher(`/students/3/workouts/${old.id}`, "PATCH", edit)).status,
    200,
  );
  const saved = (await student("/me/dashboard")).data.workouts.find(
    (w) => w.id === old.id,
  );
  assert.equal(saved.focus, "Força e técnica");
  assert.equal(saved.exercises[0].sets, 4);
  assert.equal(
    (
      await teacher(`/students/3/workouts/${old.id}`, "PATCH", {
        ...edit,
        exercises: [{ ...edit.exercises[0], sets: 0 }],
      })
    ).status,
    400,
  );
  assert.equal(
    (await student("/me/dashboard")).data.workouts.find((w) => w.id === old.id)
      .exercises[0].sets,
    4,
  );
  const created = await teacher("/students/3/workouts", "POST", {
    ...edit,
    title: "Treino C",
  });
  assert.equal(created.status, 201);
  assert.equal((await student("/me/dashboard")).data.workouts.length, 3);
});
test("Aluno atualiza perfil sem alterar suas permissões ou matrícula", async (t) => {
  const { client } = await fixture(t);
  const api = client();
  await login(api, "aluno");
  const result = await api("/me", "PATCH", {
    name: "Ana Atualizada",
    email: "ana.atualizada@exemplo.com",
    phone: "(11) 99999-8888",
    role: "gerente",
    planId: 4,
    active: false,
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.name, "Ana Atualizada");
  assert.equal(result.data.role, "aluno");
  assert.equal(result.data.planId, 3);
  assert.equal(result.data.active, true);
  assert.equal(
    (await api("/auth/me")).data.email,
    "ana.atualizada@exemplo.com",
  );
});
test("Inativação revoga sessões e impede novo login; reativação restaura o acesso", async (t) => {
  const { client } = await fixture(t);
  const student = client();
  const manager = client();
  await login(student, "aluno");
  await login(manager, "gerente");
  const user = (await manager("/admin/users")).data.find((u) => u.id === 3);
  assert.equal(
    (await manager("/admin/users/3", "PATCH", { ...user, active: false }))
      .status,
    200,
  );
  assert.equal((await student("/me/dashboard")).status, 401);
  assert.equal(
    (
      await student("/auth/login", "POST", {
        email: "aluno@serfit.com",
        password,
      })
    ).status,
    401,
  );
  assert.equal((await manager("/admin/users/3", "PATCH", user)).status, 200);
  assert.equal(
    (
      await student("/auth/login", "POST", {
        email: "aluno@serfit.com",
        password,
      })
    ).status,
    200,
  );
});
test("Gestão preserva responsáveis e impede inativar professor com alunos ativos", async (t) => {
  const { client } = await fixture(t);
  const manager = client();
  await login(manager, "gerente");
  const teacher = (await manager("/admin/users")).data.find((u) => u.id === 2);
  assert.equal(
    (await manager("/admin/users/2", "PATCH", { ...teacher, active: false }))
      .status,
    400,
  );
  assert.equal(
    (
      await manager("/admin/users/1", "PATCH", {
        name: "Outro Gerente",
        email: "gerente@serfit.com",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await manager("/admin/users", "POST", {
        name: "Gerente Dois",
        email: "gerente2@exemplo.com",
        password,
        role: "gerente",
      })
    ).status,
    400,
  );
});
test("Catálogo editado se reflete no público e arquivamento mantém matrículas existentes", async (t) => {
  const { client } = await fixture(t);
  const manager = client();
  const student = client();
  const visitor = client();
  await login(manager, "gerente");
  await login(student, "aluno");
  const plan = (await manager("/admin/plans")).data.find((p) => p.id === 3);
  assert.equal(
    (
      await manager("/admin/plans/3", "PATCH", {
        ...plan,
        price: 115,
        active: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (await visitor("/catalog")).data.plans.some((p) => p.id === 3),
    false,
  );
  assert.equal((await student("/me/dashboard")).data.plan.price, 115);
  assert.equal(
    (
      await visitor("/auth/register", "POST", {
        name: "Novo Aluno",
        email: "novo@exemplo.com",
        password,
        planId: 3,
      })
    ).status,
    400,
  );
  const modality = await manager("/admin/modalities", "POST", {
    name: "Pilates",
    category: "EQUILÍBRIO",
    description: "Uma atividade cadastrada pelo gerente.",
    icon: "jump",
    active: true,
  });
  assert.equal(modality.status, 201);
  assert.equal(
    (await visitor("/catalog")).data.modalities.some(
      (m) => m.name === "Pilates",
    ),
    true,
  );
});
test("Servidor rejeita alterações de origens não permitidas", async (t) => {
  const { client } = await fixture(t);
  const response = await client()(
    "/auth/login",
    "POST",
    { email: "aluno@serfit.com", password },
    { Origin: "https://origem-nao-permitida.example" },
  );
  assert.equal(response.status, 403);
});
test("Dados persistem após fechar e reabrir o banco SQLite", () => {
  const directory = mkdtempSync(join(process.cwd(), "tests/.temp-"));
  const path = join(directory, "serfit.sqlite");
  try {
    const first = createDatabase({ path, seed: true });
    first.prepare("UPDATE users SET name=? WHERE id=3").run("Ana Persistida");
    first.close();
    const second = createDatabase({ path, seed: true });
    assert.equal(
      second.prepare("SELECT name FROM users WHERE id=3").get().name,
      "Ana Persistida",
    );
    assert.equal(
      second.prepare("SELECT count(*) as total FROM users").get().total,
      5,
    );
    second.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
