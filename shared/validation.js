export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function textValue(value, label, min = 1, max = 200) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new ValidationError(
      `${label}: informe entre ${min} e ${max} caracteres.`,
    );
  return value.trim();
}
export function emailValue(value) {
  const email = textValue(value, "E-mail", 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ValidationError("Informe um e-mail válido.");
  return email;
}
export function passwordValue(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128)
    throw new ValidationError("A senha deve ter entre 8 e 128 caracteres.");
  return value;
}
export function phoneValue(value) {
  if (value === undefined || value === "") return "";
  const phone = textValue(value, "Telefone", 8, 30);
  if (!/^[+()\d\s-]+$/.test(phone))
    throw new ValidationError("Informe um telefone válido.");
  return phone;
}
export function userFields(body, { register = false } = {}) {
  const result = {
    name: textValue(body.name, "Nome", 2, 100),
    email: emailValue(body.email),
    phone: phoneValue(body.phone),
  };
  if (register || body.password) result.password = passwordValue(body.password);
  return result;
}
export function planFields(body) {
  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0 ||
    body.price > 99999
  )
    throw new ValidationError("Informe um valor válido para o plano.");
  if (
    !Array.isArray(body.benefits) ||
    !body.benefits.length ||
    body.benefits.length > 12
  )
    throw new ValidationError("Informe de 1 a 12 benefícios.");
  return {
    name: textValue(body.name, "Nome do plano", 2, 80),
    price: Math.round(body.price * 100) / 100,
    subtitle: textValue(body.subtitle, "Descrição", 2, 160),
    benefits: body.benefits.map((x) => textValue(x, "Benefício", 2, 160)),
    featured: Boolean(body.featured),
    active: body.active !== false,
  };
}
export function modalityFields(body) {
  return {
    name: textValue(body.name, "Nome da modalidade", 2, 80),
    category: textValue(body.category, "Categoria", 2, 30),
    description: textValue(body.description, "Descrição", 2, 400),
    icon: ["dumbbell", "karate", "boxing", "music", "jump"].includes(body.icon)
      ? body.icon
      : "dumbbell",
    active: body.active !== false,
  };
}
export function workoutFields(body) {
  if (
    !Array.isArray(body.exercises) ||
    !body.exercises.length ||
    body.exercises.length > 30
  )
    throw new ValidationError("Inclua de 1 a 30 exercícios no treino.");
  return {
    title: textValue(body.title, "Título", 2, 80),
    focus: textValue(body.focus, "Foco", 2, 100),
    instructions:
      typeof body.instructions === "string"
        ? body.instructions.trim().slice(0, 2000)
        : "",
    exercises: body.exercises.map((e) => {
      if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20)
        throw new ValidationError(
          "As séries devem ser um número inteiro de 1 a 20.",
        );
      return {
        name: textValue(e.name, "Exercício", 2, 100),
        sets: e.sets,
        reps: textValue(e.reps, "Repetições", 1, 50),
        load: textValue(e.load, "Carga", 1, 50),
        rest: textValue(e.rest, "Intervalo", 1, 50),
      };
    }),
  };
}
