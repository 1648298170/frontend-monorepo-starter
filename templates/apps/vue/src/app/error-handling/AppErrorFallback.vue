<script setup lang="ts">
// 展示组件只抛出恢复意图，实际刷新策略由异常边界决定。
defineEmits<{
  reload: [];
}>();
</script>

<template>
  <!-- role=alert 让辅助技术能够识别这是需要关注的错误状态。 -->
  <main class="app-error" role="alert">
    <div class="app-error__content">
      <p class="app-error__eyebrow">APPLICATION ERROR</p>
      <h1 class="app-error__title">页面暂时无法显示</h1>
      <p class="app-error__description">
        系统已记录本次异常，请刷新页面后重试。
      </p>
      <button class="app-error__action" type="button" @click="$emit('reload')">
        重新加载
      </button>
    </div>
  </main>
</template>

<style scoped lang="scss">
// 错误页使用全屏居中布局，不依赖已发生异常的业务页面样式。
.app-error {
  display: grid;
  min-height: 100vh;
  padding: 2rem;
  place-items: center;
}

// 限制内容宽度，保证错误说明在宽屏下仍便于阅读。
.app-error__content {
  max-width: 32rem;
}

.app-error__eyebrow {
  color: var(--color-text-muted, #64748b);
  font-size: 0.75rem;
  font-weight: 700;
}

.app-error__title {
  margin: 0.5rem 0;
  font-size: 2rem;
}

.app-error__description {
  color: var(--color-text-muted, #64748b);
  line-height: 1.6;
}

// 使用原生按钮保留键盘操作和辅助技术语义。
.app-error__action {
  margin-top: 1rem;
  border: 0;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  background: #111827;
  color: #fff;
  cursor: pointer;
}
</style>
