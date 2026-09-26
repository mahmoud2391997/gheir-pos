import "dotenv/config";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/_core/password";
import { getDb, getUserByUsername } from "../server/db";

type Role = "cashier" | "admin";

function readFlag(name: string) {
  const raw = process.argv.find(arg => arg.startsWith(`--${name}=`));
  if (!raw) return undefined;
  return raw.slice(name.length + 3);
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function toRole(value: string | undefined): Role {
  if (value === "admin") return "admin";
  return "cashier";
}

async function main() {
  const usernameRaw = readFlag("username");
  const password = readFlag("password");
  const role = toRole(readFlag("role"));
  const name = readFlag("name") ?? null;
  const email = readFlag("email") ?? null;
  const update = hasFlag("update");

  if (!usernameRaw || !password) {
    throw new Error(
      "Usage: pnpm user:create --username=<username> --password=<password> [--role=admin|cashier] [--name=...] [--email=...] [--update]"
    );
  }

  const username = normalizeUsername(usernameRaw);
  if (username.length < 3 || username.length > 64) {
    throw new Error("username must be between 3 and 64 characters");
  }
  if (password.length < 8 || password.length > 256) {
    throw new Error("password must be between 8 and 256 characters");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required to create users");
  }

  const existing = await getUserByUsername(username);
  if (existing && !update) {
    throw new Error(
      `User '${username}' already exists. Re-run with --update to update password/role.`
    );
  }

  const passwordHash = await hashPassword(password);
  const openIdBase = `local:${username}`;
  const openId = openIdBase.length <= 64 ? openIdBase : `local:${nanoid(12)}`;

  if (!existing) {
    await db.insert(users).values({
      openId,
      username,
      passwordHash,
      name,
      email,
      loginMethod: "local",
      role,
      lastSignedIn: new Date(),
    });
  } else {
    await db
      .update(users)
      .set({
        passwordHash,
        role,
        name,
        email,
        loginMethod: existing.loginMethod ?? "local",
        lastSignedIn: new Date(),
      })
      .where(eq(users.id, existing.id));
  }

  console.log(
    `${existing ? "Updated" : "Created"} user '${username}' (${role}).`
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  });
