# JLPT N3 V2.2.1 修正版

只需要把 `app.js` 覆蓋 GitHub repository root 的舊 `app.js`。

修正：
- 舊 localStorage 格式兼容，避免 `Object.values ... null or undefined`
- 自動修復舊 `n3_mastery`、`n3_progress` 等資料，不會因更新而刪除
- Settings 按鈕由 JS 自動建立對應 dialog，因此不需要修改目前的 `index.html`
- 保留跨模式／跨輪次去重
- 保留弱項、難度及到期複習邏輯
- 啟動時先修復資料，再渲染首頁
- JavaScript syntax check 已通過

不要替換 `questions.json`、`knowledge.json`、`index.html`、`style.css`、`assets/`。
