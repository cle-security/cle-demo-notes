<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api/client";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: string;
}

const users = ref<AdminUser[]>([]);

async function load() {
  const { users: u } = await api.get<{ users: AdminUser[] }>("/api/admin/users");
  users.value = u;
}

async function toggle(u: AdminUser) {
  await api.post(`/api/admin/users/${u.id}/disable`, { disabled: !u.disabled });
  await load();
}

onMounted(load);
</script>

<template>
  <h1>Admin</h1>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="text-align: left; border-bottom: 1px solid var(--border);">
        <th style="padding: 0.4rem;">Username</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="u in users" :key="u.id" style="border-bottom: 1px solid var(--border);">
        <td style="padding: 0.4rem;"><RouterLink :to="`/u/${u.username}`">@{{ u.username }}</RouterLink></td>
        <td>{{ u.email }}</td>
        <td>{{ u.role }}</td>
        <td>{{ u.disabled ? "disabled" : "active" }}</td>
        <td>
          <button v-if="u.role !== 'admin'" @click="toggle(u)">
            {{ u.disabled ? "Enable" : "Disable" }}
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
