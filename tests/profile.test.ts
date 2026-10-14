import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  UserSession,
} from "../src/lib/auth";

describe("Fitur Profil dan Manajemen Akun", () => {
  describe("Keamanan Kata Sandi (Password Hashing & Verification)", () => {
    it("dapat melakukan hash dan verifikasi password dengan benar", async () => {
      const password = "adminPassword123";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("menolak password yang tidak cocok", async () => {
      const password = "correctPassword";
      const hash = await hashPassword(password);

      const isInvalid = await verifyPassword("wrongPassword", hash);
      expect(isInvalid).toBe(false);
    });

    it("menghasilkan salt unik sehingga hash berbeda untuk password yang sama", async () => {
      const password = "samePasswordEverywhere";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("Token Sesi JWT Pengguna", () => {
    it("dapat membuat dan memverifikasi token sesi dengan data profil pengguna", async () => {
      const user: UserSession = {
        id: "user-test-uuid-123",
        username: "operator_bel",
        fullName: "Ahmad Operator",
        role: "OPERATOR",
      };

      const token = await createSessionToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(user.id);
      expect(decoded?.username).toBe("operator_bel");
      expect(decoded?.fullName).toBe("Ahmad Operator");
      expect(decoded?.role).toBe("OPERATOR");
    });

    it("menolak token sesi yang telah dimanipulasi atau tidak valid", async () => {
      const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token";
      const decoded = await verifySessionToken(invalidToken);
      expect(decoded).toBeNull();
    });
  });

  describe("Aturan Validasi Data Profil & Password", () => {
    function validateProfileUpdate(data: {
      fullName?: string;
      username?: string;
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }) {
      const errors: string[] = [];

      if (data.fullName !== undefined) {
        const trimmed = data.fullName.trim();
        if (trimmed.length < 2) {
          errors.push("Nama lengkap minimal 2 karakter.");
        }
      }

      if (data.username !== undefined) {
        const trimmed = data.username.trim().toLowerCase();
        if (trimmed.length < 3) {
          errors.push("Username minimal 3 karakter.");
        }
      }

      if (data.newPassword) {
        if (!data.currentPassword) {
          errors.push("Password saat ini wajib diisi untuk mengubah password.");
        }
        if (data.newPassword.length < 6) {
          errors.push("Password baru minimal 6 karakter.");
        }
        if (data.newPassword !== data.confirmPassword) {
          errors.push("Konfirmasi password baru tidak cocok.");
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    }

    it("memvalidasi nama lengkap minimal 2 karakter", () => {
      expect(validateProfileUpdate({ fullName: "A" }).valid).toBe(false);
      expect(validateProfileUpdate({ fullName: " " }).valid).toBe(false);
      expect(validateProfileUpdate({ fullName: "Budi" }).valid).toBe(true);
    });

    it("memvalidasi username minimal 3 karakter", () => {
      expect(validateProfileUpdate({ username: "ab" }).valid).toBe(false);
      expect(validateProfileUpdate({ username: "admin" }).valid).toBe(true);
    });

    it("memvalidasi keharusan password saat ini jika mengganti password", () => {
      const res = validateProfileUpdate({
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain("Password saat ini wajib diisi untuk mengubah password.");
    });

    it("memvalidasi panjang password baru minimal 6 karakter", () => {
      const res = validateProfileUpdate({
        currentPassword: "oldpassword",
        newPassword: "12345",
        confirmPassword: "12345",
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain("Password baru minimal 6 karakter.");
    });

    it("memvalidasi ketidakcocokan konfirmasi password baru", () => {
      const res = validateProfileUpdate({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpasswordBeda",
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain("Konfirmasi password baru tidak cocok.");
    });

    it("menerima pembaruan password yang lengkap dan valid", () => {
      const res = validateProfileUpdate({
        fullName: "Nama Baru",
        username: "userbaru",
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });
  });
});
