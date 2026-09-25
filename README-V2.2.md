# JLPT N3 V2.2 修正版

這個資料夾只包含本次修正的 `app.js`。

## 修正重點
- 不同模式共用 `n3_question_history`
- 不同輪次避免短期重複相同題目
- 普通／考官／每日模式優先抽取最近未出現題目
- 到期複習模式仍會優先抽取到期題
- 同一概念可以再次練習，但會優先換題
- 每輪仍維持 10 題
- 保留原有 localStorage 學習紀錄
- 修正舊版 Settings click handler
- 保留原有題庫 `questions.json`，不需要替換

## 安裝
把這個 `app.js` 覆蓋 GitHub repository root 的原有 `app.js`。

不要刪除或替換原有：
- `questions.json`
- `knowledge.json`
- `index.html`
- `style.css`
- `assets/`

上傳後等待 GitHub Pages 完成部署，再重新整理網站。

## 測試
1. 普通練習開始一輪。
2. 完成或離開後，再開考官模式。
3. 再開每日 10 分鐘。
4. 比較各輪題目，不應立即重複上一輪題目。
5. 若答錯某個文法概念，之後可以再次考同一概念，但應優先使用另一道題。
6. 到期複習則可以重新出現已到期題目。

如果瀏覽器之前已儲存大量舊紀錄，去 Settings 使用「清除學習紀錄」後再測試最容易確認去重效果。
