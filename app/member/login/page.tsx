import Link from "next/link";
import { MemberLoginForm } from "./member-login-form";

export default function MemberLoginPage() {
  return (
    <main className="loginShell">
      <section className="panel loginPanel">
        <p className="eyebrow">Member Login</p>
        <h1>會員登入</h1>
        <p>請使用店家建立會員時留下的手機號碼登入。初始密碼為手機號碼後 4 碼。</p>
        <MemberLoginForm />
        <div className="loginHint">
          <p>還沒有會員資料時，請先由店家後台建立會員。</p>
          <Link className="textLink secondary" href="/">
            回首頁
          </Link>
        </div>
      </section>
    </main>
  );
}
