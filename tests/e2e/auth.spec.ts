import { test, expect } from "@playwright/test";
import {
  mockTurnstile,
  verifyEmailDirectly,
  uniqueEmail,
  uniqueIp,
  waitForTurnstileReady,
} from "./helpers";

test.describe("Inscription, vérification, connexion, déconnexion", () => {
  test("un utilisateur peut s'inscrire, vérifier son email, se connecter et se déconnecter", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const email = uniqueEmail("e2e");
    await mockTurnstile(page);

    await page.goto("/register");
    await waitForTurnstileReady(page);
    await page.getByLabel("Nom").fill("E2E Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await page.getByLabel(/J'accepte les/).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.getByText(email)).toBeVisible();

    await verifyEmailDirectly(email);

    await page.goto("/login");
    await waitForTurnstileReady(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/);

    await page.goto("/account");
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("l'inscription est bloquée sans acceptation des CGU", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    await mockTurnstile(page);
    await page.goto("/register");
    await waitForTurnstileReady(page);
    await page.getByLabel("Nom").fill("No Tos");
    await page.getByLabel("Email").fill(uniqueEmail("no-tos"));
    await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page.getByText(/accepter les CGU/)).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Rate limiting", () => {
  test("bloque la connexion après trop de tentatives échouées", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const email = uniqueEmail("ratelimit");
    await mockTurnstile(page);
    await page.goto("/login");
    await waitForTurnstileReady(page);

    let sawRateLimited = false;
    for (let i = 0; i < 11 && !sawRateLimited; i++) {
      const responsePromise = page.waitForResponse("**/api/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Mot de passe", { exact: true }).fill("wrong-password");
      await page.getByRole("button", { name: "Se connecter" }).click();
      const response = await responsePromise;
      if (response.status() === 429) sawRateLimited = true;
    }

    expect(sawRateLimited).toBe(true);
  });
});

test.describe("Révocation de session à distance", () => {
  test("une session révoquée depuis un autre navigateur perd son accès", async ({ browser }) => {
    const email = uniqueEmail("revoke");
    const ip = uniqueIp();

    const setupContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
    const setupPage = await setupContext.newPage();
    await mockTurnstile(setupPage);
    await setupPage.goto("/register");
    await waitForTurnstileReady(setupPage);
    await setupPage.getByLabel("Nom").fill("Revoke Test");
    await setupPage.getByLabel("Email").fill(email);
    await setupPage.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await setupPage.getByLabel(/J'accepte les/).check();
    await setupPage.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(setupPage).toHaveURL(/\/verify-email/);
    await verifyEmailDirectly(email);
    await setupContext.close();

    const contextA = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
    const pageA = await contextA.newPage();
    await mockTurnstile(pageA);
    await pageA.goto("/login");
    await waitForTurnstileReady(pageA);
    await pageA.getByLabel("Email").fill(email);
    await pageA.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await pageA.getByRole("button", { name: "Se connecter" }).click();
    await expect(pageA).toHaveURL(/^http:\/\/[^/]+\/$/);
    await pageA.goto("/account");

    const contextB = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
    const pageB = await contextB.newPage();
    await mockTurnstile(pageB);
    await pageB.goto("/login");
    await waitForTurnstileReady(pageB);
    await pageB.getByLabel("Email").fill(email);
    await pageB.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await pageB.getByRole("button", { name: "Se connecter" }).click();
    await expect(pageB).toHaveURL(/^http:\/\/[^/]+\/$/);
    await pageB.goto("/account");

    // From session A, revoke every other session in the list.
    await pageA.reload();
    const revokeButtons = pageA.getByRole("button", { name: "Révoquer cette session" });
    await expect(revokeButtons.first()).toBeVisible();
    const revokeResponse = pageA.waitForResponse("**/api/auth/revoke-session");
    await revokeButtons.first().click();
    await revokeResponse;

    // Session B should now be logged out on its next authenticated navigation.
    await pageB.goto("/account");
    await expect(pageB).toHaveURL(/\/login/);

    await contextA.close();
    await contextB.close();
  });
});
