// 恢复动作由上层注入，使展示组件不直接绑定具体恢复策略。
interface AppErrorFallbackProps {
  onReload: () => void;
}

// 全局错误展示组件只提供用户可理解的信息和重新加载入口。
export function AppErrorFallback({ onReload }: AppErrorFallbackProps) {
  return (
    <main className="app-error" role="alert">
      <div className="app-error__content">
        <p className="app-error__eyebrow">APPLICATION ERROR</p>
        <h1 className="app-error__title">页面暂时无法显示</h1>
        <p className="app-error__description">
          系统已记录本次异常，请刷新页面后重试。
        </p>
        <button className="app-error__action" type="button" onClick={onReload}>
          重新加载
        </button>
      </div>
    </main>
  );
}
