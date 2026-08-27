import { describe, expect, it } from "vitest";
import { mergeUsersByEmail } from "@/drizzle/migrate-from-booklist-v1";

function user(id: string, email: string, createdAt: string) {
  return { id, email, createdAt: new Date(createdAt) };
}

describe("mergeUsersByEmail", () => {
  it("laisse intacts des comptes aux adresses distinctes", () => {
    const rows = [
      user("1", "a@example.com", "2024-01-01"),
      user("2", "b@example.com", "2024-02-01"),
    ];

    const { primaryUsers, redirectedUserIds, merged } = mergeUsersByEmail(rows);

    expect(primaryUsers).toHaveLength(2);
    expect(redirectedUserIds.size).toBe(0);
    expect(merged).toHaveLength(0);
  });

  it("normalise toutes les adresses en minuscules", () => {
    const rows = [user("1", "Alice@Example.COM", "2024-01-01")];

    const { primaryUsers } = mergeUsersByEmail(rows);

    // better-auth cherche l'utilisateur en minuscules : sans normalisation, ce compte
    // deviendrait injoignable.
    expect(primaryUsers[0].email).toBe("alice@example.com");
  });

  it("fusionne deux comptes qui ne diffèrent que par la casse", () => {
    const rows = [
      user("majuscule", "Alice@example.com", "2024-01-01"),
      user("minuscule", "alice@example.com", "2024-06-01"),
    ];

    const { primaryUsers, redirectedUserIds, merged } = mergeUsersByEmail(rows);

    expect(primaryUsers).toHaveLength(1);
    expect(merged).toEqual([{ from: "Alice@example.com", into: "alice@example.com" }]);
    expect(redirectedUserIds.get("majuscule")).toBe("minuscule");
  });

  it("conserve le compte dont l'adresse était déjà en minuscules, même s'il est plus récent", () => {
    const rows = [
      user("ancien-majuscule", "Alice@example.com", "2020-01-01"),
      user("recent-minuscule", "alice@example.com", "2024-01-01"),
    ];

    const { primaryUsers, redirectedUserIds } = mergeUsersByEmail(rows);

    // C'est l'adresse par laquelle la personne se connecte, donc son mot de passe qui doit
    // survivre — l'ancienneté ne prime pas ici.
    expect(primaryUsers[0].id).toBe("recent-minuscule");
    expect(redirectedUserIds.get("ancien-majuscule")).toBe("recent-minuscule");
  });

  it("retient le plus ancien quand aucune adresse n'est déjà en minuscules", () => {
    const rows = [
      user("recent", "ALICE@example.com", "2024-01-01"),
      user("ancien", "Alice@Example.com", "2020-01-01"),
    ];

    const { primaryUsers, redirectedUserIds } = mergeUsersByEmail(rows);

    expect(primaryUsers[0].id).toBe("ancien");
    expect(primaryUsers[0].email).toBe("alice@example.com");
    expect(redirectedUserIds.get("recent")).toBe("ancien");
  });

  it("fusionne trois variantes de la même adresse en un seul compte", () => {
    const rows = [
      user("1", "Alice@example.com", "2024-01-01"),
      user("2", "alice@example.com", "2024-02-01"),
      user("3", "ALICE@EXAMPLE.COM", "2024-03-01"),
    ];

    const { primaryUsers, redirectedUserIds, merged } = mergeUsersByEmail(rows);

    expect(primaryUsers).toHaveLength(1);
    expect(primaryUsers[0].id).toBe("2");
    expect(merged).toHaveLength(2);
    expect(redirectedUserIds.get("1")).toBe("2");
    expect(redirectedUserIds.get("3")).toBe("2");
  });
});
