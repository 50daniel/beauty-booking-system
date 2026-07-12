# AGENT.md

這份文件是給下次 Codex 或維護者快速接手用。請先讀這份，再看 `README.md`、`prisma/schema.prisma` 和最近的 git log。

## 專案現況

- 專案: 美容預約系統
- Repo: `https://github.com/50daniel/beauty-booking-system`
- Production: `https://beauty-booking-system-six.vercel.app`
- Vercel project: `techx11/beauty-booking-system`
- Supabase project ref: `hpsdxgzxisdqgnnavpzb`
- Supabase region: `ap-northeast-2` Seoul
- Vercel Function region: `hnd1` Tokyo，設定在 `vercel.json`
- 主要分支: `main`

不要在文件、commit 或回覆中貼出資料庫密碼。使用者曾貼過 Supabase database URL，但不要重複輸出。

## 技術架構

- Next.js 15 App Router
- TypeScript
- Prisma 5.22
- Supabase PostgreSQL
- Vercel deployment
- FullCalendar for admin calendar

這是單一 Next.js app，同時包含前台、後台與 API routes。API routes 用 Prisma 連 Supabase。

## 登入與帳號

後台 seed 帳號:

- `admin@example.com` / `admin1234`
- `lin@example.com` / `staff1234`
- `chen@example.com` / `staff1234`
- `wu@example.com` / `staff1234`

會員登入:

- 後台先建立會員。
- 會員用手機號碼登入。
- 初始密碼為手機後 4 碼。
- 舊會員若還沒有 `MemberCredential`，用手機後 4 碼登入時會 lazy create credential。
- 未來 LINE 整合建議綁 `lineUserId` 到既有 member，不要直接用 LINE 建一套孤立會員。

## 目前核心流程

前台 `/booking`:

1. 未登入會員會導到 `/member/login`。
2. 會員選 service、staff、date、slot、payment method。
3. payment method 可以是 course 或 wallet。
4. course 只能用已購買且可用堂數大於 0 的服務。
5. wallet 需要餘額大於等於 service 當下 price。
6. 建立 appointment，初始 status 是 `pending`。
7. 建立付款保留紀錄。

後台:

- confirm pending appointment: 只把 appointment 改成 `confirmed`，不正式扣款。
- complete appointment: 正式扣堂數或扣儲值金。
- reject pending appointment: 釋放保留的堂數或儲值金。
- cancel/no_show: 目前都視為退回保留或退款，不扣除。

時段佔用:

- `pending` 和 `confirmed` 會擋可預約時段。
- `completed`、`cancelled`、`rejected`、`no_show` 不擋未來時段。

## 新增資料表

Migration:

- `prisma/migrations/20260711090000_member_balances_and_wallet/migration.sql`

新增表:

- `MemberCredential`
- `MemberCourseBalance`
- `AppointmentPayment`
- `MemberCourseTransaction`
- `WalletTransaction`

Supabase 上已手動套用這個 migration，且 `_prisma_migrations` 已有 `20260711090000_member_balances_and_wallet` 紀錄。新表已 enable RLS。因目前由 Next.js backend 使用 Prisma 存取，不是前端直接用 Supabase Data API，所以不需要開前端 RLS policy。

## 近期已完成的重要修正

最近已推上 main 的 commits:

- `78b1668 Add member balances and wallet booking flow`
  - 新增會員手機登入、課程堂數、儲值金、預約付款保留與扣款流程。
- `1a9ed21 Fix booking slot conflicts and release rejected reservations`
  - `pending` 和 `confirmed` 都擋時段。
  - 完成的預約不再擋未來時段。
  - 拒絕 pending 時釋放付款保留。
  - 增加 booking transaction timeout。
- `4cdf16e Speed up availability checks`
  - availability API 改成只查選定日期需要的資料。
  - 平行查詢獨立 DB queries。
- `a9abd15 Run Vercel functions near Supabase`
  - `vercel.json` 指定 Vercel Function region 為 `hnd1`。
- `8b76e09 Handle booking request network failures`
  - 前端預約送出加 timeout 與錯誤處理。
- `0eed181 Confirm submitted bookings after uncertain responses`
  - 新增 `/api/appointments/lookup`。
  - 前端遇到 timeout/network failure 時回查後端是否已建立預約。

## 效能狀態

Production smoke test 觀察值:

- admin login 約 1.38s
- create member 約 0.87s
- add course 約 1.03s
- member login 約 0.44s
- availability 約 0.84s
- booking 約 1.95s
- reject cleanup 約 1.34s

若使用者說預約又卡住，優先檢查:

1. Vercel deployment 是否是最新 commit。
2. Vercel function logs 是否有 Prisma timeout。
3. Supabase 是否 cold start 或連線數不足。
4. `/api/appointments/request` 是否已建立 appointment 但前端沒有收到 response。
5. `/api/appointments/lookup` 是否有查到剛建立的 appointment。

## 目前本機工作區注意事項

在更新這份文件時，工作區曾顯示以下未提交差異:

- `app/api/appointments/request/route.ts`
- `app/api/availability/route.ts`
- `app/booking/booking-flow.tsx`
- `app/globals.css`
- `lib/booking.ts`
- `.claude/` untracked

這些不是本次文件整理要處理的內容。下次接手請先跑:

```bash
git status --short
git diff --stat
```

不要直接 revert，因為可能是使用者或前一輪留下的有效修改。

目前已知未提交程式差異大意:

- 預約建立後回傳最新會員 course/wallet account。
- 前端預約成功後即時更新畫面上的課程堂數與儲值金餘額。
- 預約成功後把剛送出的 slot 標示為不可預約，避免使用者連點。
- availability slot 可能新增 `available` 與 `unavailableReason` 欄位。

如果要完成這些差異，請先檢查完整 diff、跑測試或 smoke test，再 commit。

## 常用檢查

查看最近 commit:

```bash
git log -5 --oneline
```

查看 dirty state:

```bash
git status --short
git diff --stat
```

本機開發:

```bash
npm install
npm run prisma:generate
npm run dev
```

部署:

- 正常情況下 push 到 GitHub main，Vercel 會自動部署。
- 若改 schema，需確認 Supabase migration 已套用。
- 不要依賴 `.env.local`，前一次 Vercel env pull 曾抓到空 DB 值。

## 後續建議工作

優先:

- 處理目前本機未提交的預約成功後 UI 即時更新差異。
- 清理後台舊中文亂碼。
- 增加後台修改管理員密碼功能。
- 補預約流程測試，包含 course/wallet reserve、confirm、complete、reject、cancel、no_show。

中期:

- LINE 官方帳號或 LINE Login 綁定會員。
- 會員交易紀錄頁。
- 預約通知與提醒。
- 報表: 每日預約、收入、課程消耗、儲值金餘額。

正式使用前:

- 換掉 seed 密碼。
- 設定正式網域。
- 設定資料庫備份。
- 檢查 Vercel/Supabase 免費額度是否足夠。
- 確認個資與隱私權流程。

## Commit 風格

使用者希望大量改動時 commit message 不要只有「fix xxx」，要稍微詳細:

```text
Short imperative subject

- 調整了什麼
- 如何調整
- 影響哪些流程或頁面
```
