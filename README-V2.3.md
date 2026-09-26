# JLPT N3 V2.3 — 教學式解析升級

## 本版目的
將原本「只說符合／不適合語境」的解釋，升級成真正的老師式解析。

### 正確答案
可顯示：
- 意思
- 接續
- 詞性
- 基本用法
- 語感／語氣
- 為甚麼本句正確
- 日文例句
- 例句繁體中文

### 其他選項
每一個選項都獨立解釋：
- 它本身是甚麼意思
- 怎樣接續
- 一般用法
- 本題為甚麼不適合
- 適合時的例句

例如：
「名詞＋な＋ので」
會直接列在「接續」欄，不再只說「不符合語境」。

## 需要上傳的檔案

### 必須
- `app.js` → 覆蓋現有版本

### 建議
- 將 `style-v2.3-patch.css` 的內容加入現有 `style.css`

### 題庫
`questions-explanation-schema.json` 是新版 explanation 資料格式範例。

現有 `questions.json` 如果只有舊式短 explanation，前端會兼容舊格式；但要得到完整教學解析，題目本身應逐題加入新版 explanation 結構。

## 重要
不要刪除：
- n3_progress
- n3_mastery
- n3_wrong_answers
- n3_review_schedule
- n3_question_history

V2.3 保留 V2.2.1 的舊資料兼容、跨模式去重及 Settings 修正。
