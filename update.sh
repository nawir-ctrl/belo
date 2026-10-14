#!/bin/bash
set -e

# Berpindah ke direktori tempat skrip ini berada
cd "$(dirname "$0")"

echo "=========================================="
echo "🚀 MEMULAI UPDATE SMARTBELL LOCAL"
echo "=========================================="

# 1. Menarik kode terbaru dari GitHub
echo "==> [1/4] Menarik pembaruan dari GitHub..."
git pull origin main

# 2. Sinkronisasi skema database SQLite & Prisma client
echo "==> [2/4] Sinkronisasi skema database..."
npx prisma db push
npx prisma generate

# 3. Build aplikasi Next.js untuk produksi
echo "==> [3/4] Melakukan build Next.js..."
npm run build

# 4. Restart proses aplikasi secara aman (hanya aplikasi Bel, tidak mengganggu web lain)
echo "==> [4/4] Memeriksa & me-restart proses aplikasi..."
if command -v pm2 >/dev/null 2>&1; then
  # Cari nama aplikasi yang mengandung kata 'bel' atau 'smartbell' di PM2
  APP_NAME=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | grep -iE 'bel|smartbell' | head -n 1 | cut -d'"' -f4 || true)
  
  if [ -n "$APP_NAME" ]; then
    echo "    Me-restart aplikasi PM2: $APP_NAME"
    pm2 restart "$APP_NAME"
    echo "    ✅ Berhasil me-restart $APP_NAME di PM2."
  else
    echo "    ℹ️ Nama aplikasi spesifik tidak terdeteksi otomatis di PM2."
    echo "    Silakan restart aplikasi melalui panel web (misal aaPanel) atau jalankan:"
    echo "    pm2 restart <nama_aplikasi_bel>"
  fi
else
  echo "    ℹ️ PM2 tidak ditemukan di sistem shell ini."
  echo "    Silakan restart service aplikasi Anda secara manual atau via dashboard web."
fi

echo "=========================================="
echo "🎉 UPDATE SELESAI DENGAN SUKSES!"
echo "=========================================="
