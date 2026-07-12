# 美容預約系統

這是一套小型美容店使用的預約與會員課程管理系統。前台提供會員登入與預約，後台提供店家管理預約、會員、課程堂數、儲值金、服務項目、美容師與排班。

## 目前上線狀態

- 正式網址: https://beauty-booking-system-six.vercel.app
- GitHub: https://github.com/50daniel/beauty-booking-system
- Vercel 專案: `techx11/beauty-booking-system`
- Supabase 專案 ID: `hpsdxgzxisdqgnnavpzb`
- Supabase 區域: `ap-northeast-2`，Northeast Asia Seoul
- Vercel Function 區域: `hnd1`，Tokyo，已在 `vercel.json` 設定，降低連 Supabase 的延遲

重要提醒: 資料庫密碼、Vercel/Supabase 金鑰不要寫進 repo。正式環境請放在 Vercel Environment Variables。

## 技術架構

- 前端與後端: Next.js 15 App Router
- 語言: TypeScript
- 資料庫 ORM: Prisma 5.22
- 雲端資料庫: Supabase PostgreSQL
- 部署平台: Vercel
- 行事曆顯示: FullCalendar

目前是「Next.js 前後端整合」架構:

- 使用者看到的頁面由 Next.js 提供
- `/api/...` 後端 API 也放在同一個 Next.js 專案
- Prisma 負責連線到 Supabase PostgreSQL
- Vercel 負責把網站和 API 部署到外網

## 主要頁面

- `/`: 首頁
- `/booking`: 會員預約頁，需要會員登入
- `/member/login`: 會員登入
- `/admin/login`: 後台登入
- `/admin`: 後台預約管理
- `/admin/members`: 會員管理、課程堂數、儲值金
- `/admin/calendar`: 行事曆檢視
- `/admin/schedules`: 美容師排班與休假
- `/admin/settings/services`: 服務項目管理
- `/admin/settings/staff`: 美容師管理

## 測試帳號

後台管理員:

- Email: `admin@example.com`
- Password: `admin1234`

美容師帳號:

- `lin@example.com` / `staff1234`
- `chen@example.com` / `staff1234`
- `wu@example.com` / `staff1234`

會員登入方式:

- 後台先在 `/admin/members` 建立會員
- 會員用手機號碼登入
- 初始密碼是手機號碼後 4 碼
- 未來若串接 LINE 官方帳號，建議把 LINE user id 綁定到既有會員，手機仍保留為主要識別資料

## 目前預約規則

1. 會員必須先登入才能預約。
2. 會員選擇服務、美容師、日期、時間與付款方式。
3. 付款方式分為課程堂數與儲值金。
4. 使用課程堂數時，只能預約已購買且剩餘堂數大於 0 的服務。
5. 使用儲值金時，只要儲值金餘額大於等於該服務目前價格，就可以預約所有服務。
6. 目前不支援「部分儲值金加現金」。
7. 預約送出後狀態是 `pending`，等待後台確認。
8. `pending` 和 `confirmed` 都會佔用時段，避免重複預約。
9. `completed`、`cancelled`、`rejected`、`no_show` 不會佔用未來時段。

## 課程堂數與儲值金規則

課程堂數:

- 後台可替會員新增某服務的購買堂數。
- 會員預約成功時會先保留 1 堂。
- 後台將預約改成完成後，才正式扣除 1 堂。
- 取消、拒絕、未到目前都會退回已保留堂數。

儲值金:

- 後台可替會員新增儲值金。
- 會員可用儲值金預約任一服務。
- 預約時使用當下服務價格。
- 預約成功時先保留金額。
- 後台將預約改成完成後，才正式扣款。
- 取消、拒絕、未到目前都會退回保留金額。

## 主要資料表

核心資料:

- `Member`: 會員資料
- `MemberCredential`: 會員登入憑證
- `Staff`: 美容師
- `Service`: 服務項目
- `StaffService`: 美容師可提供的服務
- `StaffSchedule`: 美容師固定排班
- `StaffTimeOff`: 美容師休假
- `Appointment`: 預約
- `AdminUser`: 後台帳號
- `BusinessSetting`: 店家設定

會員資產與交易紀錄:

- `MemberCourseBalance`: 會員課程堂數餘額
- `MemberCourseTransaction`: 課程堂數異動紀錄
- `WalletTransaction`: 儲值金異動紀錄
- `AppointmentPayment`: 預約付款保留與扣款紀錄
- `PurchaseRecord`: 舊版購買紀錄，仍可保留查詢用途

## 重要 API

前台:

- `GET /api/services`: 取得服務項目
- `GET /api/staff?serviceId=...`: 取得可提供該服務的美容師
- `GET /api/availability?serviceId=...&staffId=...&date=...`: 查詢可預約時段
- `POST /api/appointments/request`: 建立預約
- `GET /api/appointments/lookup`: 在前端送出逾時或網路不穩時，確認後端是否已收到預約

後台:

- `POST /api/admin/auth/login`: 後台登入
- `POST /api/admin/auth/logout`: 後台登出
- `GET /api/admin/appointments`: 預約列表
- `POST /api/admin/appointments/:id/confirm`: 確認預約
- `POST /api/admin/appointments/:id/reject`: 拒絕預約
- `PATCH /api/admin/appointments/:id/status`: 更新完成、取消、未到等狀態
- `GET /api/admin/members`: 會員列表
- `POST /api/admin/members`: 建立會員
- `POST /api/admin/members/:id/course-balances`: 新增會員課程堂數
- `POST /api/admin/members/:id/wallet`: 新增會員儲值金
- `GET /api/admin/calendar`: 後台行事曆資料
- `GET /api/admin/schedules`: 排班資料
- `PUT /api/admin/day-schedules`: 更新單日排班
- `POST /api/admin/time-off`: 新增休假
- `DELETE /api/admin/time-off/:id`: 刪除休假

## 資料庫與部署筆記

Supabase:

- 使用 PostgreSQL。
- 目前 schema 已新增會員登入、課程堂數、儲值金與預約付款相關資料表。
- 對應 migration: `prisma/migrations/20260711090000_member_balances_and_wallet/migration.sql`
- 這次 migration 曾因 Vercel CLI 抓不到完整資料庫環境變數，最後是手動在 Supabase SQL Editor 套用。
- 新增表已啟用 RLS。因目前所有操作都經過 Next.js API + Prisma，不是讓前端直接打 Supabase Data API，所以暫時不需要開放前端 RLS policy。

Vercel:

- GitHub main branch 推送後會自動部署。
- `vercel.json` 已指定 Function region 為 Tokyo `hnd1`。
- Production URL 目前指到 `beauty-booking-system-six.vercel.app`。

## 效能狀態

之前前台預約會卡很久，主要原因是 Vercel Function 與 Supabase 區域延遲，以及可預約時段查詢撈太多資料。

已完成調整:

- Vercel Function 改到 Tokyo。
- 可預約時段 API 只查詢選定日期需要的排班、休假和預約。
- 可平行查詢的資料已平行化。
- 預約送出加入前端逾時處理。
- 若前端網路逾時但後端已收到預約，會用 lookup API 回查並顯示成功。

最近一次 production smoke test 約略結果:

- 後台登入約 1.4 秒
- 建立會員約 0.9 秒
- 新增課程約 1 秒
- 會員登入約 0.4 秒
- 查詢可預約時段約 0.8 秒
- 建立預約約 2 秒

## 目前本機注意事項

本機工作區可能還有未提交的程式差異，例如預約成功後即時更新會員餘額、將剛送出的時段標示不可再點選等。若下次接手時看到 dirty working tree，請先用 `git status --short` 和 `git diff --stat` 確認，不要直接還原使用者或前一輪留下的修改。

另外，本機有 `.claude/` 未追蹤資料夾，這不是目前專案必要檔案，不要主動提交，除非使用者明確要求。

## 已知待整理問題

- 部分舊頁面或舊 README 曾出現中文編碼亂碼，後續可以逐步整理後台文案。
- 後台管理員密碼目前仍是 seed 測試密碼，正式營運前應改成店家自訂安全密碼。
- 尚未串接 LINE 官方帳號。
- 尚未做正式金流，只是管理課程堂數與儲值金帳務紀錄。
- 尚未做簡訊、Email 或 LINE 預約通知。
- 尚未做多店分店架構，目前以單店測試為主。

## 建議後續 Roadmap

短期:

- 整理後台中文文案與亂碼。
- 補上後台修改管理員密碼功能。
- 完成會員課程堂數、儲值金、預約成功後的前端即時狀態更新。
- 補更多預約流程測試，尤其是取消、未到、拒絕、完成後的帳務紀錄。

中期:

- 串接 LINE Login 或 LINE 官方帳號綁定會員。
- 後台增加交易紀錄查詢與匯出。
- 增加預約提醒通知。
- 增加店家營運報表，例如每日預約、收入、課程消耗。

正式營運前:

- 更換所有預設後台密碼。
- 確認 Vercel 與 Supabase 方案是否足夠。
- 設定自訂網域。
- 備份資料庫。
- 檢查隱私權、個資保存與店家操作流程。

## 本機開發

安裝套件:

```bash
npm install
```

建立或更新 Prisma client:

```bash
npm run prisma:generate
```

執行 migration:

```bash
npm run prisma:migrate
```

執行 seed:

```bash
npm run prisma:seed
```

啟動開發伺服器:

```bash
npm run dev
```

開啟:

```text
http://localhost:3000
```
