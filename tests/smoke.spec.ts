import { test, expect } from "@playwright/test";

// 스모크 테스트: DB 없이도 각 페이지가 치명적 에러 없이 로드되고
// 공통 레이아웃(상단 네비게이션)이 렌더되는지 확인한다.
// (실시간/DB 동작이 아니라 "배포된 번들이 부팅되는가"를 검증)
const paths = ["/", "/attendance", "/game", "/settings"];

for (const path of paths) {
  test(`${path} 페이지가 치명적 에러 없이 로드된다`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response, `${path}: 응답이 없습니다`).not.toBeNull();
    expect(response!.status(), `${path}: HTTP 상태`).toBeLessThan(400);

    // 상단 네비게이션 로고(공통 레이아웃)가 보이는지 → 앱 셸이 정상 렌더됨
    // (홈 페이지는 히어로 로고까지 2개라 first()로 네비게이션 로고를 특정)
    await expect(page.getByAltText("N.M.D.R Logo").first()).toBeVisible();

    // 페이지 스크립트에 치명적(uncaught) 에러가 없어야 한다
    expect(
      pageErrors,
      `${path}: 치명적 에러 발생 → ${pageErrors.join(" | ")}`
    ).toHaveLength(0);
  });
}
