# Fix: Unauthorized Error pada Print/Download PDF (JWT di localStorage)

## Masalah

Response yang muncul saat klik tombol **Print** atau **Download**:

```json
{"error":"Unauthorized","redirect":"/"}
```

URL yang diakses:
- Print: `https://papertrail.pilargroup.id/api/frp/8f505903-a68d-4214-99fd-0df4b533bec5/print`
- Download: `https://papertrail.pilargroup.id/api/frp/8f505903-a68d-4214-99fd-0df4b533bec5/pdf`

## Root Cause

Response `{"error":"Unauthorized","redirect":"/"}` berasal dari **Express** (bukan nginx) — artinya routing nginx untuk `/api/` sudah benar dan request berhasil sampai ke backend.

Penyebab sebenarnya:

- Autentikasi menggunakan **JWT di localStorage / Authorization header**, bukan cookie session.
- Tombol Print/Download di FE memicu `window.open(url)` atau `<a href="...">` untuk membuka tab baru.
- Saat membuka URL langsung di tab baru (direct navigation), **browser tidak menyertakan Authorization header** — header itu hanya nempel kalau request dikirim lewat `fetch`/`axios` yang diset manual.
- Akibatnya, request ke `/api/frp/.../print` atau `/pdf` "polos" tanpa token → middleware auth Express menolak → `Unauthorized`.

### Cara verifikasi
1. Buka salah satu URL di atas langsung di tab baru saat sudah login di FE — apakah tetap error?
2. Cek kode FE, biasanya ada baris seperti:
   ```js
   axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
   ```
   Ini konfirmasi auth berbasis Bearer token, bukan cookie.
3. Cek middleware auth di Express:
   ```js
   const token = req.headers.authorization?.split(' ')[1];
   ```
   Kalau begini, token memang tidak akan ditemukan saat direct navigation.

## Solusi

### Opsi A — Fetch as Blob (direkomendasikan, tidak perlu ubah backend)

Ganti dari `window.open(url)` langsung menjadi fetch dulu dengan token, baru buka hasilnya.

```js
async function handlePdfAction(id, action = 'download') {
  const token = localStorage.getItem('token'); // sesuaikan key-nya
  const res = await fetch(`/api/frp/${id}/${action === 'print' ? 'print' : 'pdf'}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    // handle unauthorized / error
    return;
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  if (action === 'download') {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `document-${id}.pdf`;
    a.click();
  } else if (action === 'print') {
    const printWindow = window.open(blobUrl);
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
```

Pendekatan ini paling clean karena backend tetap memakai middleware JWT yang sama, tidak perlu disentuh.

#### ⚠️ Catatan: Popup blocker

Beberapa browser men-block `window.open` kalau dipanggil di dalam `async` setelah `await` (dianggap bukan hasil langsung dari user gesture). Trik mengatasinya: buka window kosong dulu **sebelum** fetch (sinkron dengan klik), baru set `location` setelah blob siap.

```js
async function handlePrint(id) {
  const printWindow = window.open('', '_blank'); // buka dulu, sinkron dgn klik
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/frp/${id}/print`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  printWindow.location = blobUrl;
}
```

### Opsi B — Short-lived Signed URL

Cocok kalau masih butuh kemampuan direct link / dibuka manual.

1. Backend generate token sementara khusus akses file ini (misal valid 1–2 menit).
2. FE minta token tersebut dulu lewat API biasa (yang menyertakan Authorization header):

   ```
   GET /api/frp/:id/print-token  → return { url: "/api/frp/:id/print?token=xyz" }
   ```

3. Endpoint `/print` dan `/pdf` di Express perlu menerima `req.query.token` selain header Authorization untuk verifikasi JWT-nya.

## Rekomendasi

Untuk kasus ini, **Opsi A sudah cukup** dan tidak perlu mengubah backend sama sekali.
