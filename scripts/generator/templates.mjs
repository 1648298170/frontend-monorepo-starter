// React 组件模板使用显式 Props 和语义化 section，方便直接扩展与测试。
export function reactComponentTemplate({ pascalName }) {
  return `interface ${pascalName}Props {
  // 组件标题由调用方传入，实际业务可以继续扩展 Props。
  title: string;
}

// ${pascalName} 负责展示当前组件区域，业务逻辑应按需拆到 Hook。
export function ${pascalName}({ title }: ${pascalName}Props) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
    </section>
  );
}
`;
}

export function reactComponentTestTemplate({ pascalName }) {
  return `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ${pascalName} } from "./${pascalName}";

// 组件测试只验证用户可见行为，不读取组件内部实现。
describe("${pascalName}", () => {
  it("renders the provided title", () => {
    render(<${pascalName} title="${pascalName} title" />);

    expect(
      screen.getByRole("heading", { name: "${pascalName} title" })
    ).toBeInTheDocument();
  });
});
`;
}

export function vueComponentTemplate({ pascalName }) {
  return `<script setup lang="ts">
interface Props {
  // 组件标题由调用方传入，实际业务可以继续扩展 Props。
  title: string;
}

defineProps<Props>();
</script>

<template>
  <!-- ${pascalName} 负责展示当前组件区域，复杂逻辑应按需拆到 Composable。 -->
  <section :aria-label="title">
    <h2>{{ title }}</h2>
  </section>
</template>
`;
}

export function vueComponentTestTemplate({ pascalName }) {
  return `import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import ${pascalName} from "./${pascalName}.vue";

// 组件测试只验证用户可见行为，不访问组件实例内部状态。
describe("${pascalName}", () => {
  it("renders the provided title", () => {
    render(${pascalName}, {
      props: { title: "${pascalName} title" },
    });

    expect(
      screen.getByRole("heading", { name: "${pascalName} title" })
    ).toBeInTheDocument();
  });
});
`;
}

export function reactUiComponentTemplate({ pascalName, kebabName }) {
  return `import type { ${pascalName}Props } from "./${kebabName}.types";

import "../../styles/index.css";
import "./${kebabName}.css";

// ${pascalName} 是跨应用基础组件，不依赖具体业务 Store 或 Router。
export function ${pascalName}({ title }: ${pascalName}Props) {
  return (
    <section
      className="repo-ui-surface repo-${kebabName}"
      aria-label={title}
    >
      <h2 className="repo-${kebabName}__title">{title}</h2>
    </section>
  );
}
`;
}

export function reactUiTypesTemplate({ pascalName }) {
  return `export interface ${pascalName}Props {
  // 跨应用组件通过 Props 接收数据，不读取具体应用状态。
  title: string;
}
`;
}

export function reactUiStyleTemplate({ kebabName }) {
  return `.repo-${kebabName} {
  padding: var(--repo-ui-space-4);
}

.repo-${kebabName}__title {
  margin: 0;
  font-size: var(--repo-ui-font-size-large);
}
`;
}

export function vueUiComponentTemplate({ pascalName, kebabName }) {
  return `<script setup lang="ts">
import type { ${pascalName}Props } from "./${kebabName}.types";

import "../../styles/index.css";
import "./${kebabName}.css";

defineProps<${pascalName}Props>();
</script>

<template>
  <!-- ${pascalName} 是跨应用基础组件，不依赖具体业务 Store 或 Router。 -->
  <section
    class="repo-ui-surface repo-${kebabName}"
    :aria-label="title"
  >
    <h2 class="repo-${kebabName}__title">{{ title }}</h2>
  </section>
</template>
`;
}

export function vueUiTypesTemplate({ pascalName }) {
  return `export interface ${pascalName}Props {
  // 跨应用组件通过 Props 接收数据，不读取具体应用状态。
  title: string;
}
`;
}

export function componentIndexTemplate({ framework, pascalName }) {
  if (framework === "react") {
    return `export { ${pascalName} } from "./${pascalName}";
`;
  }

  return `export { default as ${pascalName} } from "./${pascalName}.vue";
`;
}

export function uiComponentIndexTemplate({ framework, pascalName, kebabName }) {
  const componentExport =
    framework === "react"
      ? `export { ${pascalName} } from "./${pascalName}";`
      : `export { default as ${pascalName} } from "./${pascalName}.vue";`;

  return `${componentExport}
export type { ${pascalName}Props } from "./${kebabName}.types";
`;
}

export function reactFeatureTemplate({ pascalName, displayName }) {
  return `// ${pascalName} 是 ${displayName} 业务能力的组合入口。
export function ${pascalName}() {
  return (
    <section aria-label="${displayName}">
      <h2>${displayName}</h2>
    </section>
  );
}
`;
}

export function vueFeatureTemplate({ pascalName, displayName }) {
  return `<script setup lang="ts">
// ${pascalName} 是 ${displayName} 业务能力的组合入口。
</script>

<template>
  <section aria-label="${displayName}">
    <h2>${displayName}</h2>
  </section>
</template>
`;
}

export function reactFeatureTestTemplate({ pascalName, displayName }) {
  return `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ${pascalName} } from "./${pascalName}";

describe("${pascalName}", () => {
  it("renders the feature heading", () => {
    render(<${pascalName} />);

    expect(
      screen.getByRole("heading", { name: "${displayName}" })
    ).toBeInTheDocument();
  });
});
`;
}

export function vueFeatureTestTemplate({ pascalName, displayName }) {
  return `import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import ${pascalName} from "./${pascalName}.vue";

describe("${pascalName}", () => {
  it("renders the feature heading", () => {
    render(${pascalName});

    expect(
      screen.getByRole("heading", { name: "${displayName}" })
    ).toBeInTheDocument();
  });
});
`;
}

export function reactPageTemplate({ pageName, displayName }) {
  return `// ${pageName} 只负责页面级组合，复用逻辑应下沉到 Feature 或 Hook。
export function ${pageName}() {
  return (
    <main>
      <h1>${displayName}</h1>
    </main>
  );
}
`;
}

export function vuePageTemplate({ pageName, displayName }) {
  return `<script setup lang="ts">
// ${pageName} 只负责页面级组合，复用逻辑应下沉到 Feature 或 Composable。
</script>

<template>
  <main>
    <h1>${displayName}</h1>
  </main>
</template>
`;
}

export function reactPageTestTemplate({ pageName, displayName }) {
  return `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ${pageName} } from "./${pageName}";

describe("${pageName}", () => {
  it("renders the page heading", () => {
    render(<${pageName} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "${displayName}" })
    ).toBeInTheDocument();
  });
});
`;
}

export function vuePageTestTemplate({ pageName, displayName }) {
  return `import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import ${pageName} from "./${pageName}.vue";

describe("${pageName}", () => {
  it("renders the page heading", () => {
    render(${pageName});

    expect(
      screen.getByRole("heading", { level: 1, name: "${displayName}" })
    ).toBeInTheDocument();
  });
});
`;
}

export function reactStoreTemplate({ pascalName, useStoreName }) {
  return `import { create } from "zustand";

interface ${pascalName}State {
  // initialized 表示该业务状态是否完成初始化。
  initialized: boolean;
  // 通过 Action 更新状态，避免组件直接操作内部实现。
  setInitialized: (initialized: boolean) => void;
}

// ${useStoreName} 管理当前业务域状态，按需继续扩展 State 和 Action。
export const ${useStoreName} = create<${pascalName}State>((set) => ({
  initialized: false,
  setInitialized: (initialized) => set({ initialized }),
}));
`;
}

export function reactStoreTestTemplate({ kebabName, useStoreName }) {
  return `import { beforeEach, describe, expect, it } from "vitest";

import { ${useStoreName} } from "./${kebabName}.store";

describe("${useStoreName}", () => {
  beforeEach(() => {
    ${useStoreName}.setState({ initialized: false });
  });

  it("updates initialized through its action", () => {
    ${useStoreName}.getState().setInitialized(true);

    expect(${useStoreName}.getState().initialized).toBe(true);
  });
});
`;
}

export function vueStoreTemplate({ kebabName, useStoreName }) {
  return `import { defineStore } from "pinia";
import { shallowRef } from "vue";

// ${useStoreName} 管理 ${kebabName} 业务域状态。
export const ${useStoreName} = defineStore("${kebabName}", () => {
  // initialized 表示该业务状态是否完成初始化。
  const initialized = shallowRef(false);

  // 通过 Action 更新状态，保持状态变化路径清晰。
  function setInitialized(value: boolean) {
    initialized.value = value;
  }

  return {
    initialized,
    setInitialized,
  };
});
`;
}

export function vueStoreTestTemplate({ kebabName, useStoreName }) {
  return `import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { ${useStoreName} } from "./${kebabName}.store";

describe("${useStoreName}", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates initialized through its action", () => {
    const store = ${useStoreName}();

    store.setInitialized(true);

    expect(store.initialized).toBe(true);
  });
});
`;
}

export function reactHookTemplate({ useName }) {
  return `// ${useName} 封装可复用的 React 逻辑，后续在此补充状态和副作用。
export function ${useName}() {
  return {} as const;
}
`;
}

export function reactHookTestTemplate({ useName }) {
  return `import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ${useName} } from "./${useName}";

describe("${useName}", () => {
  it("returns its public API", () => {
    const { result } = renderHook(() => ${useName}());

    expect(result.current).toEqual({});
  });
});
`;
}

export function vueComposableTemplate({ useName }) {
  return `// ${useName} 封装可复用的 Vue 逻辑，后续在此补充响应式状态和副作用。
export function ${useName}() {
  return {} as const;
}
`;
}

export function vueComposableTestTemplate({ useName }) {
  return `import { describe, expect, it } from "vitest";

import { ${useName} } from "./${useName}";

describe("${useName}", () => {
  it("returns its public API", () => {
    expect(${useName}()).toEqual({});
  });
});
`;
}
