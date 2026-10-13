import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

const prisma = new PrismaClient();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("==================================================");
  console.log("🔐 SMARTBELL LOCAL - SETUP ADMINISTRATOR UTAMA");
  console.log("==================================================");

  let username = process.argv[2];
  let password = process.argv[3];
  let fullName = process.argv[4];

  if (!username) {
    username = await prompt("Masukkan username admin baru (misal: admin): ");
  }
  if (!password) {
    password = await prompt("Masukkan password yang kuat (min. 8 karakter): ");
  }
  if (!fullName) {
    fullName = (await prompt("Masukkan nama lengkap (opsional, tekan enter jika kosong): ")) || "Administrator";
  }

  if (!username || username.length < 3) {
    console.error("❌ Username minimal 3 karakter.");
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error("❌ Password minimal 6 karakter.");
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    await prisma.user.update({
      where: { username },
      data: {
        passwordHash,
        fullName,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ Administrator '${username}' berhasil diperbarui dengan password baru.`);
  } else {
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ Administrator '${username}' berhasil dibuat.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Kesalahan saat setup admin:", err.message);
  process.exit(1);
});
