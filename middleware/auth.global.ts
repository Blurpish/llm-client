export default defineNuxtRouteMiddleware(async (to) => {
  const apiKey = useCookie("api-key")
  if (apiKey.value) return

  const { code } = to.query
  if (!code) {
    navigateTo("https://openrouter.ai/auth?callback_url=https://llm-client-two.vercel.app", { external: true })
  }

  const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    body: JSON.stringify({ code })
  });
  const { key } = await res.json()
  apiKey.value = key
})
