import Link from "next/link";

const stack = [
  {
    name: "Next.js",
    description: "負責前台、後台頁面與 API，開發時跑在 localhost:3000。",
  },
  {
    name: "PostgreSQL",
    description: "正式資料庫，儲存會員、服務、美容師、排班與預約。",
  },
  {
    name: "Prisma",
    description: "資料庫工具，用 schema 定義資料表並用 TypeScript 操作資料。",
  },
  {
    name: "FullCalendar",
    description: "後台正式日曆工具，後續用來做日/週/月與美容師篩選。",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Beauty Booking System</p>
        <h1>美容店預約系統</h1>
        <p className="heroText">
          這是正式架構的第一階段：Next.js 專案、PostgreSQL 資料模型、Prisma
          設定與開發基礎。後續會分階段加入客戶預約、會員資料、後台審核與正式日曆。
        </p>
        <div className="actions">
          <Link href="/booking">客戶預約入口</Link>
          <Link href="/admin">後台管理入口</Link>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <p className="eyebrow">Stage 1</p>
          <h2>目前完成的基礎工具</h2>
        </div>
        <div className="toolGrid">
          {stack.map((item) => (
            <article className="toolCard" key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
