import { initialPlans, initialModalities, initialUsers, initialWorkouts } from '../../shared/seed';
import { userFields, planFields, modalityFields, workoutFields, ValidationError } from '../../shared/validation';

const KEY = 'serfit-local-demo-v1';
const SESSION = 'serfit-demo-user';

const clone = value => JSON.parse(JSON.stringify(value));

let db;

try {
    db = JSON.parse(sessionStorage.getItem(KEY));
} catch {

}

if (!db?.users || !db?.plans) {
    db = clone({
        users: initialUsers,
        plans: initialPlans,
        modalities: initialModalities,
        workouts: initialWorkouts
    });
}

const save = () => sessionStorage.setItem(KEY, JSON.stringify(db));

const clean = user => {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return clone(safe);
};

const current = () => db.users.find(u => u.id === Number(sessionStorage.getItem(SESSION)) && u.active);

const nextId = list => Math.max(0, ...list.map(x => x.id)) + 1;

const fail = (message, status = 400) => {
    throw new ValidationError(message, status);
};

const auth = (...roles) => {
    const user = current();
    if (!user) fail('Entre na sua conta para continuar.', 401);
    if (roles.length && !roles.includes(user.role)) fail('Você não tem permissão para esta ação.', 403);
    return user;
};

async function digest(value) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2, '0')).join('');
}

function studentAccess(id, write = false) {
    const me = auth();
    const student = db.users.find(u => u.id === id && u.role === 'aluno');

    if (!student) fail('Aluno não encontrado.', 404);

    if (write ? !(me.role === 'professor' && student.teacherId === me.id) : !(me.role === 'gerente' || me.role === 'professor' && student.teacherId === me.id || me.role === 'aluno' && me.id === id)) {
    fail('Você não tem permissão para acessar este aluno.', 403);
    }

    return me;
}

function relations(body, target) {
    if (target.role !== 'aluno') return {
        planId: null, teacherId: null, membershipStatus: null };

    const planId = Number(body.planId);
    const plan = db.plans.find(p => p.id === planId);

    if (!plan || !plan.active && planId !== target.planId) fail('Selecione um plano disponível.');

    const teacherId = body.teacherId ? Number(body.teacherId) : null;

    if (teacherId && !db.users.some(u => u.id === teacherId && u.role === 'professor' && u.active)) {
    fail('Selecione um professor ativo.');
    }

    const membershipStatus = body.membershipStatus || 'Em análise';

    if (!['Ativa', 'Em análise'].includes(membershipStatus)) {
        fail('Situação de matrícula inválida.');
    }

    return { planId, teacherId, membershipStatus };
}

export async function demoRequest(path, method = 'GET', body = {}) {
    let result;

    if (path === '/catalog' && method === 'GET') {
        return clone({
            plans: db.plans.filter(p => p.active),
            modalities: db.modalities.filter(m => m.active)
        });
    }

    if (path === '/auth/login' && method === 'POST') {
        const user = db.users.find(u => u.email === String(body.email).trim().toLowerCase());
        const valid = user?.passwordHash ? user.passwordHash === await digest(body.password) : body.password === 'SerFit2026!';
    
    if (!user?.active || !valid) fail('E-mail ou senha inválidos.', 401);
    
    sessionStorage.setItem(SESSION, String(user.id));
    return clean(user);
    }

    if (path === '/auth/register' && method === 'POST') {
        const { password, ...fields } = userFields(body, { register: true });

        if (db.users.some(u => u.email === fields.email)) fail('Este e-mail já está cadastrado.', 409);
        if (!db.plans.some(p => p.id === Number(body.planId) && p.active)) fail('Selecione um plano disponível.');
    
    const user = {
        id: nextId(db.users),
        ...fields,
        passwordHash: await digest(password),
        role: 'aluno',
        active: true,
        planId: Number(body.planId),
        teacherId: null,
        membershipStatus: 'Em análise',
        joinedAt: new Date().toISOString().slice(0, 10)
    };

    db.users.push(user);
    sessionStorage.setItem(SESSION, String(user.id));
    save();
    return clean(user);
    }

    if (path === '/auth/logout' && method === 'POST') {
        sessionStorage.removeItem(SESSION);
        return { message: 'Você saiu da sua conta.' };
    }

    if (path === '/auth/me') {
        return clean(auth());
    }

    if (path === '/me' && method === 'PATCH') {
        const me = auth();
        const { password, ...fields } = userFields(body);

        if (db.users.some(u => u.email === fields.email && u.id !== me.id)) {
            fail('Este e-mail já está cadastrado.', 409);
        }
    
        Object.assign(me, fields);
        save();
        return clean(me);
    }

    if (path === '/me/dashboard') {
        const me = auth('aluno');
        return clone({
            user: clean(me),
            plan: db.plans.find(p => p.id === me.planId) || null,
            teacher: clean(db.users.find(u => u.id === me.teacherId)),
            workouts: db.workouts.filter(w => w.studentId === me.id)
        });
    }

    if (path === '/teacher/students') {
        const me = auth('professor');
        return db.users
        .filter(u => u.role === 'aluno' && u.teacherId === me.id)
        .map(u => ({
            ...clean(u),
            planName: db.plans.find(p => p.id === u.planId)?.name,
            workoutCount: db.workouts.filter(w => w.studentId === u.id).length
        }));
    }

    const workoutMatch = path.match(/^\/students\/(\d+)\/workouts(?:\/(\d+))?$/);

    if (workoutMatch) {
        const studentId = Number(workoutMatch[1]);
        const workoutId = Number(workoutMatch[2]);
        const me = studentAccess(studentId, method !== 'GET');

    if (method === 'GET') {
        return clone(db.workouts.filter(w => w.studentId === studentId));
    }

    const fields = workoutFields(body);

    if (method === 'POST') {
        result = {
            ...fields,
            id: nextId(db.workouts),
            studentId,
            teacherId: me.id,
            updatedAt: new Date().toISOString().slice(0, 10)
        };
        db.workouts.push(result);
    } else if (method === 'PATCH') {
        result = db.workouts.find(w => w.id === workoutId && w.studentId === studentId);
        if (!result) fail('Treino não encontrado.', 404);
            Object.assign(result, fields, {
            teacherId: me.id,
            updatedAt: new Date().toISOString().slice(0, 10)
        });
    } else {
        fail('Operação não disponível.', 405);
    }

    save();
    return clone(result);
    }

    if (path.startsWith('/admin/')) {
        auth('gerente');

        const match = path.match(/^\/admin\/(users|plans|modalities)(?:\/(\d+))?$/);
        if (!match) fail('Recurso não encontrado.', 404);

        const [, collection, rawId] = match;
        const id = Number(rawId);
        const list = db[collection];
    
    if (method === 'GET') {
        return collection === 'users' ? list.map(clean) : clone(list);
    }
    
    let target = list.find(x => x.id === id);
    if (method !== 'POST' && !target) fail('Registro não encontrado.', 404);
    
    let fields;
    
    if (collection === 'users') {
        if (target?.role === 'gerente') {
        fail('Use Meu perfil para atualizar sua conta. A gestão de gerentes não está habilitada.', 403);
        }

        const { password, ...user } = userFields(body, { register: method === 'POST' });

        if (list.some(u => u.email === user.email && u.id !== id)) {
            fail('Este e-mail já está cadastrado.', 409);
        }

    const role = target?.role || body.role;
        if (!['aluno', 'professor'].includes(role)) fail('Perfil inválido.');

        if (target?.role === 'professor' && body.active === false && db.users.some(u => u.teacherId === id && u.active)) {
            fail('Reatribua os alunos antes de inativar este professor.');
        }

    fields = {
        ...user,
        role,
        active: body.active !== false,
        ...relations(body, { ...target, role })
    };

    if (password) fields.passwordHash = await digest(password);
        if (target?.teacherId !== fields.teacherId) {
            db.workouts
            .filter(w => w.studentId === id)
            .forEach(w => {
                w.teacherId = fields.teacherId;
            });
        }
    } else {
        fields = collection === 'plans' ? planFields(body) : modalityFields(body);
    }
    
    if (method === 'POST') {
        target = {
            ...fields,
            id: nextId(list),
            ...(collection === 'users' ? { joinedAt: new Date().toISOString().slice(0, 10) } : {})
        };
        list.push(target);
    } else {
        Object.assign(target, fields);
    }
    
    save();
    return collection === 'users' ? clean(target) : clone(target);
}

    fail('Recurso não encontrado.', 404);
}