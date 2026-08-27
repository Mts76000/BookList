import { test, expect } from "@playwright/test";
import { Client } from "pg";
import {
  mockTurnstile,
  verifyEmailDirectly,
  uniqueEmail,
  uniqueIp,
  waitForTurnstileReady,
} from "./helpers";

/**
 * Parcours métier de bout en bout : inscription, ajout manuel d'un livre, notation, ajout
 * d'une note, saisie d'une activité de lecture, puis suppression du livre.
 *
 * La recherche Google Books n'est pas exercée ici : elle dépend d'un service tiers, ce qui
 * rendrait le test intermittent pour une raison sans rapport avec le code.
 */
async function signUpAndLogIn(page: import("@playwright/test").Page, email: string) {
  await mockTurnstile(page);

  await page.goto("/register");
  await waitForTurnstileReady(page);
  await page.getByLabel("Nom").fill("Lecteur E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
  await page.getByLabel(/J'accepte les/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/verify-email/);

  await verifyEmailDirectly(email);

  await page.goto("/login");
  await waitForTurnstileReady(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/);
}

test.describe("Bibliothèque", () => {
  test("un lecteur ajoute un livre à la main, le note, l'annote puis le supprime", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const email = uniqueEmail("e2e-books");
    await signUpAndLogIn(page, email);

    await page.goto("/books/add");
    await page.getByRole("button", { name: "Saisir manuellement" }).click();
    await page.getByLabel("Titre").fill("Le Nom du vent");
    await page.getByLabel("Auteur").fill("Patrick Rothfuss");
    await page.getByLabel("Pages").fill("700");
    await page.getByLabel("Genre").fill("Fantasy");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();

    // L'ajout redirige vers la fiche du livre, pour le noter dans la foulée.
    await expect(page).toHaveURL(/\/books\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Le Nom du vent" })).toBeVisible();

    await page.getByRole("button", { name: "Noter 4 sur 5" }).click();
    await expect(page.getByRole("button", { name: "Noter 4 sur 5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByPlaceholder("Réflexions, citations").fill("Une prose magnifique.");
    await page.getByRole("button", { name: "Ajouter une note" }).click();
    await expect(page.getByText("Une prose magnifique.")).toBeVisible();

    await page.goto("/books");
    await expect(page.getByText("Le Nom du vent")).toBeVisible();
    await expect(page.getByText("1 livre dans votre bibliothèque")).toBeVisible();

    await page.getByText("Le Nom du vent").first().click();
    await page.getByRole("button", { name: "Supprimer le livre" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page).toHaveURL(/\/books$/);
    await expect(page.getByText("Aucun livre trouvé")).toBeVisible();
  });

  test("une activité de lecture saisie apparaît dans les statistiques", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const email = uniqueEmail("e2e-activity");
    await signUpAndLogIn(page, email);

    await page.goto("/dashboard");
    // Un compte tout neuf arrive sur l'accueil des nouveaux utilisateurs, qui recouvre la page.
    await page.getByRole("button", { name: "Passer" }).click();

    await page.getByLabel("Pages lues").fill("42");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText(/42 pages/)).toBeVisible();
  });
});

test.describe("Back-office", () => {
  test("un utilisateur ordinaire ne voit pas l'administration", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const email = uniqueEmail("e2e-nonadmin");
    await signUpAndLogIn(page, email);

    const response = await page.goto("/admin");

    // 404 et non 403 : l'existence même du back-office n'est pas révélée.
    expect(response?.status()).toBe(404);
  });

  test("un administrateur accède au back-office et y retrouve les utilisateurs", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const email = uniqueEmail("e2e-admin");
    await signUpAndLogIn(page, email);

    // Le rôle n'est jamais attribuable depuis le client (input: false) : on le pose
    // directement en base, comme le ferait la migration ou un autre administrateur.
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`UPDATE "user" SET role = 'admin' WHERE email = $1`, [email]);
    await client.end();

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Vue d'ensemble" })).toBeVisible();

    await page.getByRole("link", { name: "Utilisateurs", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByText(email)).toBeVisible();
  });
});
