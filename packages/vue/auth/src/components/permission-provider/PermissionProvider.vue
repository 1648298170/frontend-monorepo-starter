<script setup lang="ts">
import { computed, provide } from "vue";

import type { PermissionCode } from "@repo/auth";

import { permissionContextKey } from "../../context/permission-context";

interface Props {
  // 当前登录主体拥有的完整权限集合。
  permissions: readonly PermissionCode[];
}

const props = defineProps<Props>();

// 权限数组变化时创建一次 Set，全部 Guard 共享同一份快速查询结构。
const permissionSet = computed(
  () => new Set<PermissionCode>(props.permissions)
);

// Provider 只负责注入权限，不依赖 Pinia、Router 或具体登录实现。
provide(permissionContextKey, permissionSet);
</script>

<template>
  <!-- Provider 不生成额外 DOM，只透传应用或局部组件树。 -->
  <slot />
</template>
