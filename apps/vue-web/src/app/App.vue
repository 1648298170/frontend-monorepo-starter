<script setup lang="ts">
import AppErrorBoundary from "./error-handling/AppErrorBoundary.vue";
</script>

<template>
  <AppErrorBoundary>
    <RouterView />
  </AppErrorBoundary>
</template>
