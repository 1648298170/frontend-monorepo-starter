# EditorConfig 规范

仓库根目录的 `.editorconfig` 用于统一不同编辑器和操作系统的基础文件格式。
它负责编辑器层面的通用约定，Prettier 和 ESLint 继续负责具体代码风格与质量规则。

## 默认规则

```ini
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
```

- 所有文本文件使用 UTF-8。
- 源码、配置和文档默认使用 LF 换行。
- 文件末尾必须保留一个换行。
- 默认使用两个空格缩进，不使用 Tab。
- 自动删除无意义的行尾空格。

## 文件覆盖

### Markdown

Markdown 不自动删除行尾空格，因为连续两个行尾空格具有显式换行语义。

### YAML

YAML 和 YML 文件固定使用两个空格缩进，禁止使用 Tab。

### Makefile

Makefile 命令必须使用 Tab，因此单独覆盖默认空格缩进。

### Windows 脚本

`.bat`、`.cmd` 和 `.ps1` 使用 CRLF，以提高 Windows 原生命令行工具兼容性。

## 与其他工具的关系

- `.editorconfig`：字符集、换行符、缩进和文件末尾换行。
- `prettier.config.js`：JavaScript、TypeScript、Vue、JSON、Markdown 等格式。
- `eslint.config.js`：代码质量、框架规则和依赖边界。
- `.gitattributes`：如未来加入，负责 Git 检出和提交时的换行标准化。

修改 `.editorconfig` 时需要同步检查 Prettier 和 VS Code 配置，避免规则互相冲突。
