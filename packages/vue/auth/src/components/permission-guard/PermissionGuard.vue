<script setup lang="ts">
import type { PermissionCode, PermissionMode } from "@repo/auth";

import { usePermission } from "../../composables/usePermission";

interface Props {
  // 当前内容要求的权限码。
  permissions: readonly PermissionCode[];
  // all 要求全部满足，any 要求任意一个满足。
  mode?: PermissionMode;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "all",
});

// 使用 getter 保持 Props 更新与权限结果之间的响应式联系。
const canAccess = usePermission(
  () => props.permissions,
  () => props.mode
);
</script>

<template>
  <!-- 权限满足时渲染业务内容，否则渲染可选 fallback 插槽。 -->
  <slot v-if="canAccess" />
  <slot v-else name="fallback" />
</template>
