# 🎓 JLPT N3 日語水平考官

GitHub Pages 可直接發布的純前端 JLPT N3 日語學習模擬器。

## 檔案

```text
JLPT-N3/
├── index.html
├── style.css
├── app.js
├── questions.json
├── knowledge.json
├── README.md
└── assets/
    └── favicon.svg
```

## 發布

Repository 根目錄直接放置上述檔案。

GitHub → Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`。

不需要 Node、npm、Vite 或後端。

## 重要

本版本使用相對路徑：

- `./style.css`
- `./app.js`
- `./questions.json`
- `./assets/favicon.svg`

因此適用於 GitHub Pages 的 Project Site，例如 `/JLPT-N3/`。

`app.js` 會在 DOM 載入後註冊按鈕事件，再載入 `questions.json`。如果題庫載入失敗，頁面會顯示明確錯誤，而不是只留下無法操作的首頁。

## 學習資料

學習進度使用瀏覽器 localStorage 儲存，不需要帳戶、資料庫或遠端 AI API。

能力指標 0–100 是本工具自己的學習指標，不是官方 JLPT 分數或合格預測。

## 題庫

保留現有 `questions.json` 即可。`validity: "ambiguous"` 的題目不會計入正式作答。

建議持續人工審核題目，確保每題只有一個合理答案。
