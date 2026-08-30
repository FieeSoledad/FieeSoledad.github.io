# Fiee Soledad Blog

这是一个基于 Astro 的静态个人博客，适合部署到 GitHub Pages。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端提示的地址，通常是 `http://localhost:4321`。

## 如何新增博客

1. 在 `src/content/posts/` 新建一个 `.md` 文件，例如 `my-first-note.md`。
2. 文件顶部写 Frontmatter：

```markdown
---
title: 我的第一篇文章
description: 一句话介绍文章内容
published: 2026-08-30
tags: [生活, 随笔]
---
```

3. 在下方继续写 Markdown 正文。支持标题、列表、链接、图片和代码块。
4. 执行 `npm run dev` 预览；确认无误后提交并推送：

```bash
git add .
git commit -m "Add: 我的第一篇文章"
git push
```

文章 URL 会自动变成 `/blog/my-first-note/`。草稿可设置 `draft: true`，构建时不会发布。

图片可以放进 `public/images/`，然后在文章中使用：

```markdown
![图片说明](/images/example.jpg)
```

## 项目目录

- `src/content/posts/`：Markdown/MDX 文章
- `src/pages/categories/`：按类别归档页面
- `src/pages/`：页面和路由
- `src/layouts/`：公共页面布局
- `src/content.config.ts`：文章字段校验
- `public/`：不会被处理的静态资源

## 按类别归档

每篇文章用 `category` 指定一个主类别，用 `tags` 指定多个辅助标签：

```yaml
category: 日漫
tags: [推荐, 动画]
```

类别总览在 `/categories/`，例如 `日漫` 类别在 `/categories/日漫/`。

## 发布

先执行 `npm run build`，生成的静态文件在 `dist/`。可以通过 GitHub Actions 将 `dist/` 部署到 GitHub Pages。
