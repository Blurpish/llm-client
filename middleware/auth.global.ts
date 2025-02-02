export default defineNuxtRouteMiddleware(async (to) => {
  const apiKey = useCookie("api-key")
  if (apiKey.value) return

  const { code } = to.query
  const callbackUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : 'https://llm-client-two.vercel.app'

  if (!code) {
    navigateTo(`https://openrouter.ai/auth?callback_url=${callbackUrl}`, { external: true })
  }

  const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    body: JSON.stringify({ code })
  });
  const { key } = await res.json()
  apiKey.value = key
})
