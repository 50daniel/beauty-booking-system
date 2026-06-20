# 美容店預約系統

這個專案正在從靜態 MVP 升級成正式架構：Next.js + PostgreSQL + Prisma + FullCalendar。

## 目前狀態

已完成：

- 第 1 階段：Next.js + Prisma + PostgreSQL 基礎架構。
- 第 1.5 階段：Docker PostgreSQL 本機資料庫。
- 第 2 階段：客戶前台預約流程。
- 第 3 階段：後台審核與會員資料。
- 第 4 階段：正式日曆與排班設定。
- 第 5 階段：服務與美容師管理設定、會員購買紀錄。
- 第 6 階段：後台登入與角色權限。
- 第 6.5 階段：預約必填欄位修正、會員管理頁、排班/休假頁重設計。
- 第 6.6 階段：排班改為月曆式每日排班。
- 第 6.7 階段：全部美容師月排班總覽、正式日曆事件顯示修正、每日美容師預約排程。
- 第 6.8 階段：前台最小欄位預約修正，客戶只填姓名與手機即可送出。
- 第 6.9 階段：前台預約送出狀態修正，避免資料已建立但畫面停在「傳送中」。
- 第 6.10 階段：修正前台成功後誤顯示連線問題；表單元素在非同步送出前先保存，避免 React 事件失效。
- 第 6.11 階段：後台輸入流程改為站內 modal，移除瀏覽器原生 prompt。

下一階段：

- 第 7 階段：通知整合、訂金/付款或報表功能規劃。

## 專案架構

- Next.js：負責前台、後台與 API。
- PostgreSQL：正式資料庫，儲存會員、預約、服務、排班等資料。
- Prisma：用 schema 管理資料表與 TypeScript 查詢。
- FullCalendar：後台正式預約日/週/月日曆；事件來源由 `/api/admin/calendar` 提供。

主要入口：

- `/`：專案首頁與工具說明。
- `/booking`：客戶預約申請入口。
- `/admin`：後台管理入口。
- `/admin/login`：後台登入頁。
- `/admin/members`：會員管理。
- `/admin/calendar`：正式預約日曆。
- `/admin/schedules`：美容師排班與休假設定。
- `/admin/settings/services`：服務項目設定。
- `/admin/settings/staff`：美容師設定。

主要 API：

- `GET /api/services`：服務列表。
- `GET /api/staff?serviceId=...`：可服務美容師。
- `GET /api/availability?serviceId=...&staffId=...&date=...`：可預約時段。
- `POST /api/appointments/request`：建立待確認預約申請。
- `GET /api/admin/appointments`：後台預約列表。
- `POST /api/admin/appointments/:id/confirm`：確認預約。
- `POST /api/admin/appointments/:id/reject`：拒絕預約。
- `PATCH /api/admin/appointments/:id/status`：更新已確認預約狀態。
- `GET /api/admin/members`：會員列表與近期預約。
- `GET /api/admin/calendar`：正式日曆事件，只回傳 `confirmed` 預約。
- `GET /api/admin/schedules?month=YYYY-MM`：讀取美容師月排班與休假。
- `PUT /api/admin/day-schedules`：設定某位美容師某一天上班時間或整天休假。
- `PUT /api/admin/schedules`：舊版每週排班 API，保留作為未設定每日排班時的 fallback。
- `POST /api/admin/time-off`：新增美容師整天休假。
- `DELETE /api/admin/time-off/:id`：刪除美容師休假。
- `GET /api/admin/services`：後台服務列表。
- `POST /api/admin/services`：新增服務。
- `PATCH /api/admin/services/:id`：更新服務。
- `GET /api/admin/staff`：後台美容師列表與可選服務。
- `POST /api/admin/staff`：新增美容師。
- `PATCH /api/admin/staff/:id`：更新美容師與可服務項目。
- `POST /api/admin/members/:id/purchases`：新增會員購買紀錄。
- `POST /api/admin/auth/login`：後台登入。
- `POST /api/admin/auth/logout`：後台登出。

## 角色權限

後台只允許 `admin` 管理員與 `staff` 美容師登入。

測試帳號：

- 管理員：admin@example.com / admin1234
- 美容師：lin@example.com / staff1234
- 美容師：chen@example.com / staff1234
- 美容師：wu@example.com / staff1234

權限矩陣：

- 客戶前台 `/booking`：不需登入。
- 後台首頁 `/admin`：管理員與美容師。
- 正式日曆 `/admin/calendar`：管理員與美容師。
- 預約確認/拒絕/改狀態 API：管理員與美容師。
- 會員資料與購買紀錄：管理員與美容師。
- 排班/休假 `/admin/schedules`：管理員可編輯，美容師可查看。
- 服務設定 `/admin/settings/services`：僅管理員。
- 美容師設定 `/admin/settings/staff`：僅管理員。
- 排班/休假查詢 API：管理員與美容師。
- 排班、休假修改 API：僅管理員。
- 服務、美容師設定 API：僅管理員。

未登入進入後台頁面會導到 `/admin/login`。美容師嘗試進入管理員設定頁會回到 `/admin`。

## 已完成功能

### 客戶前台 `/booking`

- 從 PostgreSQL 讀取服務項目。
- 選服務後載入可服務美容師。
- 選美容師與日期後查詢可預約時段。
- 只有姓名與手機必填。
- Email、生日、過敏/禁忌、會員備註、本次預約備註皆為選填。
- 表單用 `*` 標示必填欄位，不再逐欄顯示「必填 / 選填」，減少表單佔用空間。
- 前端送出前會 trim 欄位；後端會把空白的選填欄位視為未填，避免空白 Email、生日或備註造成「資料不完整」。
- 送出流程有 JSON 解析保護、連線錯誤處理與 20 秒逾時保護，避免資料已建立但前台停在「正在送出預約申請」。
- 表單送出時會先保存目前表單元素，再進行非同步 API 呼叫，避免預約已建立後因 React event `currentTarget` 失效而誤顯示「連線問題」。
- 送出成功後會在表單上方顯示成功訊息與申請編號。
- 送出後建立 `pending` 預約申請。
- 手機號碼會自動合併會員資料。
- `pending` 不會正式占用日曆時段，確認時才會檢查正式衝突。

### 後台 `/admin`

- Dashboard 顯示待確認申請、今日已確認預約、會員數。
- 可查看待確認申請。
- 可確認預約，狀態由 `pending` 變成 `confirmed`。
- 確認時會用 Prisma transaction 再次檢查：
  - 同一美容師同時段不可已有另一筆 `confirmed`。
  - 預約需符合美容師排班。
  - 不可落在店休日或美容師休假。
- 可拒絕預約並保存拒絕原因。
- 拒絕預約時使用站內 modal 輸入原因，不再使用瀏覽器原生跳窗。
- 已確認預約可更新為 `completed`、`cancelled`、`no_show`。
- 可查看會員資料、過敏/禁忌、會員備註與近期預約。
- 可查看會員購買紀錄。
- 可新增會員購買紀錄，包含品項、金額、日期與備註。
- 新增購買紀錄使用站內 modal 表單，可一次輸入品項、金額、購買日期與備註。
- 依登入角色顯示可用入口：美容師可看到預約、日曆、會員管理、排班/休假查看；管理員可看到所有設定頁。

### 會員管理 `/admin/members`

- 集中搜尋與查看會員。
- 可編輯姓名、手機、Email、生日、過敏/禁忌、會員備註、內部備註。
- 可查看近期預約。
- 可查看購買紀錄。
- 可新增購買紀錄。
- 新增購買紀錄使用站內 modal，不再分三次跳出瀏覽器輸入框。

### 正式日曆 `/admin/calendar`

- 使用 FullCalendar 顯示正式預約。
- 支援月、週、日視圖。
- 支援依美容師篩選。
- 只顯示 `confirmed` 預約。
- 日曆事件會由前端 function event source 呼叫 `/api/admin/calendar`，取出 `events` 陣列後交給 FullCalendar，因此確認後的預約會正確顯示。
- 日曆事件標題包含美容師、會員與服務，事件資料也帶有 `resourceId` 供後續美容師分欄或資源檢視擴充。
- 日曆下方新增「每日美容師排程」，可選日期，按美容師分組顯示當天每位美容師的已確認預約。
- `pending` 預約集中顯示在右側側欄，可直接確認或拒絕。
- 從右側側欄拒絕 pending 預約時，會開啟站內 modal 輸入拒絕原因。
- 確認 pending 時仍會走後端 transaction 衝突檢查。

### 月排班與休假 `/admin/schedules`

- 以每個月為單位顯示排班。
- 支援「全部美容師」總覽，月曆每天會顯示上班人數、休假人數，並列出當天上班或休假的美容師。
- 支援選擇單一美容師與月份。
- 管理員在單一美容師模式下，可於月曆上點選日期後設定該日為上班或整天休假。
- 上班日可設定上班時間與下班時間。
- 整天休假以不同顏色顯示。
- 月曆用顏色區分：上班、休假、未設定、多人狀態。
- 若某天沒有每日排班設定，總覽會顯示舊版每週排班 fallback 的上班資料，並以「週排」標示。
- 美容師可進入頁面查看排班與休假資訊，但不能修改。
- 前台 `/booking` 的可預約時段會即時受以下條件影響：
  - 美容師每日排班。
  - 美容師每日休假。
  - 若某日沒有每日排班設定，會退回使用舊版每週排班作為 fallback。
  - 店休日。
  - 已確認預約。
  - 服務時間與緩衝時間。

### 服務設定 `/admin/settings/services`

- 可新增服務項目。
- 可編輯服務名稱、分類、說明、價格、服務分鐘、緩衝分鐘、顏色。
- 可啟用或停用服務。
- 服務列表會顯示目前可提供此服務的美容師。
- 停用服務後，前台服務列表不會顯示該服務。

### 美容師設定 `/admin/settings/staff`

- 可新增美容師。
- 可編輯姓名、手機、Email、顏色與啟用狀態。
- 可設定美容師可提供哪些服務。
- 停用美容師後，前台美容師列表不會顯示該美容師。

### 資料庫

Prisma schema 已包含：

- `Member`：會員資料。
- `Staff`：美容師。
- `Service`：服務項目。
- `StaffService`：美容師可服務項目。
- `StaffSchedule`：美容師每週排班。
- `StaffTimeOff`：美容師休假。
- `Appointment`：預約申請與正式預約。
- `NotificationLog`：通知紀錄，第一版先只寫資料不串 LINE/SMS。
- `PurchaseRecord`：會員購買紀錄。
- `AdminUser`：後台帳號。
- `BusinessSetting`：店家基本設定。

## 本機開發

1. 複製 `.env.example` 成 `.env`。
2. 設定 `DATABASE_URL` 指向 PostgreSQL。
3. 安裝套件：`npm install`。
4. 建立資料表：`npm run prisma:migrate`。
5. 建立種子資料：`npm run prisma:seed`。
6. 啟動：`npm run dev`。
7. 開啟：`http://localhost:3000`。

## Docker PostgreSQL

本機資料庫建議先用 Docker PostgreSQL，正式上線再把 `DATABASE_URL` 換成 Supabase 或 Neon。

啟動資料庫：

```bash
npm run db:up
```

查看資料庫 log：

```bash
npm run db:logs
```

建立資料表與種子資料：

```bash
npm run prisma:migrate
npm run prisma:seed
```

停止資料庫容器：

```bash
npm run db:down
```

目前 Docker 設定：

- 資料庫：`beauty_booking`
- 使用者：`beauty_booking`
- 本機連線 port：`5432`
- 資料會保存在 Docker volume `postgres_data`，容器重啟後不會消失。

## 測試方式

確認 Docker PostgreSQL 正在跑：

```bash
docker ps
```

啟動網站：

```bash
npm run dev
```

測試客戶預約：

1. 開啟 `http://localhost:3000/booking`。
2. 選擇服務、美容師、日期與時段。
3. 只填姓名與手機即可送出；其他欄位可空白。
4. 送出預約申請。
5. 到 `http://localhost:3000/admin` 查看待確認申請。

確認最小欄位預約：

```powershell
$body = @{ serviceId = 'svc-facial'; staffId = 'staff-lin'; date = '2026-06-04'; startMinute = 600; member = @{ name = '最小欄位測試'; phone = '0900000002' }; customerNote = '' } | ConvertTo-Json -Depth 5
Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/appointments/request' -ContentType 'application/json; charset=utf-8' -Body $body
```

若該日期沒有可預約空檔，請先到 `/admin/schedules` 設定該美容師當日上班，或改用目前有空檔的日期與 `startMinute`。

測試登入與權限：

1. 開啟 `http://localhost:3000/admin`。
2. 未登入時應導到 `http://localhost:3000/admin/login`。
3. 用美容師帳號 `lin@example.com / staff1234` 登入。
4. 美容師可使用 `/admin`、`/admin/calendar`、`/admin/members`、`/admin/schedules` 查看排班/休假。
5. 美容師不可使用 `/admin/settings/services`、`/admin/settings/staff`，也不能修改排班/休假。
6. 登出後用管理員 `admin@example.com / admin1234` 登入。
7. 管理員可使用所有後台功能。

用 API 驗證權限：

```bash
# 未登入呼叫管理 API 應回 401
curl -i http://localhost:3000/api/admin/services
```

PowerShell 驗證美容師不能進設定 API：

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = 'lin@example.com'; password = 'staff1234' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/admin/auth/login' -ContentType 'application/json' -Body $body -WebSession $session
Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/api/admin/appointments?status=pending' -WebSession $session
Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/api/admin/services' -WebSession $session
```

最後一個服務設定 API 對美容師應回 `403`。

測試後台日曆：

1. 到 `http://localhost:3000/admin` 確認一筆 pending 預約。
2. 到 `http://localhost:3000/admin/calendar`。
3. 在右側 pending 側欄按「確認」。
4. 確認後，該筆預約應出現在 FullCalendar 的月/週/日正式日曆中。
5. 在「每日排程日期」選擇同一天，下方「每日美容師排程」應按美容師分組顯示該筆預約。
6. 用美容師篩選確認不同美容師只顯示自己的正式預約。
7. 右側 pending 側欄仍可確認或拒絕申請。

PowerShell 端到端驗證預約確認後會進日曆：

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/auth/login' -Method Post -WebSession $session -ContentType 'application/json; charset=utf-8' -Body '{"email":"admin@example.com","password":"admin1234"}'
$services = Invoke-RestMethod -Uri 'http://localhost:3000/api/services'
$service = $services.services[0]
$staffRes = Invoke-RestMethod -Uri "http://localhost:3000/api/staff?serviceId=$($service.id)"
$staff = $staffRes.staff[0]
$testDate = '2026-06-20'
$dayScheduleBody = @{ staffId = $staff.id; date = $testDate; status = 'working'; start = '10:00'; end = '18:00'; note = '日曆顯示測試' } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/day-schedules' -Method Put -WebSession $session -ContentType 'application/json; charset=utf-8' -Body $dayScheduleBody
$availability = Invoke-RestMethod -Uri "http://localhost:3000/api/availability?serviceId=$($service.id)&staffId=$($staff.id)&date=$testDate"
$slot = $availability.slots[0]
$phone = '09' + (Get-Random -Minimum 10000000 -Maximum 99999999)
$requestBody = @{ serviceId = $service.id; staffId = $staff.id; date = $testDate; startMinute = $slot.startMinute; member = @{ name = '日曆測試客人'; phone = $phone; email = ''; birthday = ''; allergyNote = ''; note = '' }; customerNote = '確認後日曆顯示測試' } | ConvertTo-Json -Depth 5 -Compress
$request = Invoke-RestMethod -Uri 'http://localhost:3000/api/appointments/request' -Method Post -ContentType 'application/json; charset=utf-8' -Body $requestBody
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/appointments/$($request.appointment.id)/confirm" -Method Post -WebSession $session
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/calendar?staffId=$($staff.id)&start=$($testDate)T00:00:00%2B08:00&end=$($testDate)T23:59:59%2B08:00" -WebSession $session
```

最後一個日曆 API 應回傳 `events`，且至少包含剛確認的預約。

測試排班與休假：

1. 到 `http://localhost:3000/admin/schedules`。
2. 選擇「全部美容師」與月份。
3. 月曆每天應顯示上班人數、休假人數，以及當天上班/休假的美容師標籤。
4. 點選某一天，右側會列出當天每位美容師的上班、週排 fallback、休假或未設定狀態。
5. 改選單一美容師。
6. 管理員在月曆上點選某一天。
7. 設定為「上班」，輸入上班/下班時間並儲存。
8. 回到 `http://localhost:3000/booking`，選同一美容師與日期，確認可預約時段跟著變化。
9. 回到排班頁，點選另一日期，設定為「整天休假」。
10. 回到 `/booking` 選該美容師與休假日期，應該看不到可預約空檔。
11. 用美容師帳號登入時，可以查看排班與休假，但不能儲存修改。

PowerShell 驗證月排班：

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = @{ email = 'admin@example.com'; password = 'admin1234' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/admin/auth/login' -ContentType 'application/json' -Body $login -WebSession $session
$body = @{ staffId = 'staff-lin'; date = '2026-06-12'; status = 'working'; start = '13:00'; end = '17:00'; note = '月排班測試' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Method Put -Uri 'http://localhost:3000/api/admin/day-schedules' -ContentType 'application/json; charset=utf-8' -Body $body -WebSession $session
Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/api/availability?serviceId=svc-facial&staffId=staff-lin&date=2026-06-12'
```

確認 DB 內會員與預約資料：

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); Promise.all([prisma.member.count(), prisma.appointment.groupBy({ by: ['status'], _count: true }), prisma.notificationLog.count()]).then(([members, appointments, notificationLogs]) => console.log(JSON.stringify({ members, appointments, notificationLogs }, null, 2))).finally(() => prisma.$disconnect());"
```

預期可以看到：

- `members` 會大於 0。
- `appointments` 會包含 `pending`、`confirmed` 或 `rejected`。
- `notificationLogs` 會隨預約申請、確認、拒絕增加。

確認日曆事件資料：

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.appointment.findMany({ where: { status: 'confirmed' }, include: { member: true, staff: true, service: true } }).then(data => console.log(JSON.stringify(data.map(a => ({ id: a.id, member: a.member.name, staff: a.staff.name, service: a.service.name, startAt: a.startAt, endAt: a.endAt })), null, 2))).finally(() => prisma.$disconnect());"
```

確認排班與休假資料：

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.staff.findMany({ include: { schedules: true, timeOff: true } }).then(data => console.log(JSON.stringify(data.map(s => ({ name: s.name, schedules: s.schedules.length, timeOff: s.timeOff.length })), null, 2))).finally(() => prisma.$disconnect());"
```

測試服務與美容師管理：

1. 到 `http://localhost:3000/admin/settings/services`。
2. 新增或編輯一個服務。
3. 回到 `http://localhost:3000/booking`，確認啟用服務會出現在前台。
4. 到 `http://localhost:3000/admin/settings/staff`。
5. 編輯美容師可服務項目。
6. 回到 `/booking` 選服務，確認美容師列表會依可服務項目變化。

測試會員購買紀錄：

1. 到 `http://localhost:3000/admin/members`。
2. 在會員資料區按「新增購買」。
3. 輸入品項、金額與備註。
4. 會員卡片應顯示最新購買紀錄。

測試會員編輯：

1. 到 `http://localhost:3000/admin/members`。
2. 搜尋或選擇會員。
3. 按「編輯」。
4. 修改過敏/禁忌、會員備註或內部備註。
5. 按「儲存會員」。
6. 回到會員列表確認資料已更新。

確認購買紀錄資料：

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.purchaseRecord.findMany({ include: { member: true }, orderBy: { purchasedAt: 'desc' } }).then(data => console.log(JSON.stringify(data.map(p => ({ member: p.member.name, itemName: p.itemName, amount: p.amount, purchasedAt: p.purchasedAt, note: p.note })), null, 2))).finally(() => prisma.$disconnect());"
```

## 開發紀錄維護規則

每次完成新功能，都需要同步更新本 README，至少包含：

- 完成了哪些功能。
- 新增或調整了哪些主要 API/頁面/資料表。
- 使用到哪些工具，以及工具在系統中的角色。
- 如何啟動與如何測試。
- 下一階段尚未完成的工作。

## 舊版靜態 demo

`index.html`、`styles.css`、`app.js` 是前一版靜態 demo，保留作為流程參考；正式功能會逐步移到 Next.js。
