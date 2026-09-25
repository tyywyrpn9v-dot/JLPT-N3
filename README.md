# 🎓 JLPT N3 日語水平考官 V2.1

可直接部署到 GitHub Pages 的純前端 N3 自適應日語學習模擬器。

## 檔案
```text
├── index.html
├── style.css
├── app.js
├── questions.json
├── knowledge.json
├── README.md
└── assets/favicon.svg
```

## V2.1 功能
- 普通練習／👨‍🏫考官模式／每日10分鐘／到期複習
- 每輪 10 題、逐題作答、即時判題
- 「為甚麼？」及「查看其他選項」解析
- 難度 1–5、自適應選題
- Ability Score 0–100（不是官方 JLPT 分數）
- Weakness Map
- Mastery：辨認／意思／辨析／語境／主動使用
- Spaced Review
- 錯題分類
- Knowledge Cards
- Confusion Matrix 基礎資料
- localStorage 學習紀錄
- 題目 validity 品質標記
- 54 道有效原創題＋5 道歧義測試題
- 全中文（繁體中文／香港）教學介面

## 歧義題
`validity: "ambiguous"` 的題目不應作正式計分；題庫內提供 5 道測試題。

## 本地資料
`n3_progress`、`n3_mastery`、`n3_wrong_answers`、`n3_review_schedule`、`n3_question_history`、`n3_examiner_history`、`n3_saved_cards`。
全部儲存在瀏覽器 localStorage，不需要帳戶、後端、資料庫或 AI API。

## 自適應考官
本版本使用透明的 rule-based 邏輯，依據近期表現、題目難度、概念弱點、Mastery 及到期複習調整選題。UI 可以稱「AI 考官」，但實際不是遠端 AI 模型。

## GitHub Pages
把所有檔案放在 repository root → **Settings → Pages → Deploy from a branch → main / root**。不需要 npm、Node、Vite 或 build step。

## 限制
能力指標不是官方 JLPT 成績預測；聽力、自由輸入、完整句子重組及真正語音評分尚未加入；Mastery 是規則模型；localStorage 不會跨裝置同步；題庫仍應持續人工審題。

## 下一階段
可加入真正的變化題生成、完整 Confusion Matrix、漢字三層測試、填空／排序／中日互譯、聽力、會話情境、匯入匯出進度及 PWA 離線功能。
