import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { request } from "../services/api";
export default function AgentTools() {
  const { user } = useAuth();
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const validate = (input) => {
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.keys(input).length
      )
        throw new Error("Esta consulta aceita apenas um objeto vazio.");
    };
    const tools = [
      {
        name: "read_serfit_catalog",
        title: "Consultar planos e modalidades SerFit",
        description:
          "Consulta os planos disponíveis, preços, benefícios e modalidades exibidos no site.",
        execute: async (input) => {
          validate(input);
          return request("/catalog");
        },
      },
    ];
    if (user?.role === "aluno")
      tools.push({
        name: "read_my_serfit_workouts",
        title: "Consultar meus treinos SerFit",
        description:
          "Consulta somente a ficha de treinos do aluno autenticado, incluindo exercícios e orientações.",
        execute: async (input) => {
          validate(input);
          const dashboard = await request("/me/dashboard");
          return {
            teacher: dashboard.teacher?.name || null,
            workouts: dashboard.workouts,
          };
        },
      });
    for (const tool of tools) {
      try {
        Promise.resolve(
          context.registerTool(
            {
              ...tool,
              inputSchema: {
                type: "object",
                properties: {},
                additionalProperties: false,
              },
              annotations: { readOnlyHint: true, untrustedContentHint: true },
            },
            { signal: lifecycle.signal },
          ),
        ).catch(() => {});
      } catch {
        /* Optional API: the site stays usable when unavailable. */
      }
    }
    return () => lifecycle.abort();
  }, [user?.id, user?.role]);
  return null;
}
