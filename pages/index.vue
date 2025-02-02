<template>
  <div id="container">
    <section id="topbar">
      <div id="model-selector">
        GPT-3.5-Turbo
      </div>
      <div>
        <img src="~/assets/icons/edit.svg" @click="clear" />
      </div>
    </section>
    <section id="chat-container">
      <div id="chat">
        <article v-for="{ role, content } in thread">
          <div v-if="role === 'user'">
            <img src="~/assets/icons/user.svg" />
            <strong>You</strong>
          </div>
          <div v-if="role === 'assistant'">
            <img src="~/assets/icons/openrouter.ico" width="24" height="24" />
            <strong>OpenRouter</strong>
          </div>
          <div v-html="DOMPurify.sanitize(marked.parse(content))"></div>
        </article>
      </div>
    </section>
    <section id="input">
      <img src="~/assets/icons/plus.svg" />
      <input id="query-input" type="text" placeholder="Ask me anything" enterkeyhint="enter" v-model="query" :disabled="pending">
      <img id="send-icon" src="~/assets/icons/arrow-up.svg" @click="send" />
    </section>
  </div>
</template>

<script lang="ts" setup>
  import OpenAI from "openai"
  import { marked } from "marked"
  import DOMPurify from "dompurify"

  const query = ref("")
  const pending = ref(false)

  const thread = ref([])

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: useCookie("api-key").value,
    dangerouslyAllowBrowser: true,
  })

  async function send() {
    pending.value = true
    
    thread.value.push({
      role: "user",
      content: query.value.trim().replaceAll(" ", " "),
    })

    query.value = ""

    const stream = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages: thread.value,
      stream: true,
    })

    thread.value.push({ role: "assistant", content: "" })

    for await (const data of stream) {
      if (data.choices[0].finish_reason) break
      thread.value[thread.value.length - 1] = { role: "assistant", content: thread.value.at(-1).content + data.choices[0].delta.content}
    }

    pending.value = false
  }

  function clear() {
    thread.value = []
  }

  // TODO: Multimodal
  // TODO: Web search
  // TODO: Continuer un message pas terminé
  // TODO: Modifier un message
  // TODO: Regénérer la réponse
  // TODO: Sync entre devices
  // TODO: Afficher l'historique
  // TODO: Choisir le modèle
  // TODO: Modifier les paramètres du modèle
  // TODO: Ajouter des tools
  // TODO: Ajouter des extensions markdown
</script>

<style scoped>
#container {
  position: fixed;
  display: flex;
  flex-direction: column;
  height: 100%;
}

section {
  width: 100vw;
}

#topbar {
  display: flex;
  padding: 16px;
  justify-content: flex-end;
  align-items: center;
}

#model-selector {
  position: absolute;
  left: 50%;
  transform: translate(-50%);
}

#chat-container {
  flex-grow: 1;
  overflow: scroll;
  display: flex;
  flex-direction: column-reverse;
}

article {
  padding: 16px;
}

article:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

article > div:nth-child(1) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

#input {
  padding: 16px;
  height: 76px;
  display: flex;
  align-items: center;
}

#query-input {
  margin-left: 12px;
  flex-grow: 1;
  font-size: 16px;
  padding: 10px 40px 10px 12px;
  font-weight: 500;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  outline: none;
}

#query-input:focus {
  border: 1px solid rgba(0, 0, 0, 0.6);
}

#query-input:placeholder-shown ~ #send-icon {
  display: none;
}

#query-input ~ img {
  position: absolute;
  right: 28px;
}
</style>
