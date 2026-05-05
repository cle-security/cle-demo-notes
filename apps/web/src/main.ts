import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useAuthStore } from "./stores/auth";
import "./styles.css";

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  // Resolve the current user before the first navigation so guards
  // see a populated auth store on hard refresh.
  const auth = useAuthStore();
  await auth.fetchMe();

  app.mount("#app");
}

bootstrap();
