# FRP/RP Backend API Documentation

## Daftar Isi

- [1. Auth / User Session](#1-auth-user-session)
  - [Get Current User](#get-current-user)
    - [Response Example](#response-example)
- [2. Master Data](#2-master-data)
  - [Get Form Data FRP](#get-form-data-frp)
    - [Response berisi data seperti:](#response-berisi-data-seperti)
  - [Get Form Data RP](#get-form-data-rp)
    - [Response berisi data seperti:](#response-berisi-data-seperti-1)
- [3. Master Budgets](#3-master-budgets)
  - [Get All Budgets](#get-all-budgets)
    - [Response Example](#response-example-1)
  - [Create Budget](#create-budget)
    - [Body](#body)
    - [Response](#response)
  - [Update Budget](#update-budget)
    - [Example](#example)
    - [Body](#body-1)
    - [Response](#response-1)
  - [Delete / Deactivate Budget](#delete-deactivate-budget)
    - [Example](#example-1)
    - [Response](#response-2)
- [4. FRP](#4-frp)
  - [Create FRP](#create-frp)
    - [Body](#body-2)
    - [Response](#response-3)
  - [Update / Revision FRP](#update-revision-frp)
    - [Body](#body-3)
    - [Response](#response-4)
  - [Get FRP Approval Data](#get-frp-approval-data)
    - [Response Example](#response-example-2)
  - [Get FRP Detail](#get-frp-detail)
    - [Example](#example-2)
  - [Approve FRP](#approve-frp)
    - [Example](#example-3)
    - [Body](#body-4)
    - [Response](#response-5)
  - [Reject FRP](#reject-frp)
    - [Example](#example-4)
    - [Body](#body-5)
    - [Response](#response-6)
- [5. RP](#5-rp)
  - [RP Flow](#rp-flow)
    - [Flow normal untuk department selain IT/HCGA](#flow-normal-untuk-department-selain-ithcga)
    - [Flow khusus jika creator adalah IT/HCGA](#flow-khusus-jika-creator-adalah-ithcga)
    - [Reject rule](#reject-rule)
    - [Revert rule](#revert-rule)
  - [Create RP](#create-rp)
    - [Body untuk department biasa](#body-untuk-department-biasa)
    - [Body untuk creator IT/HCGA](#body-untuk-creator-ithcga)
    - [Response](#response-7)
  - [Update / Revision RP](#update-revision-rp)
    - [Body](#body-6)
    - [Response](#response-8)
  - [Get RP Approval Data](#get-rp-approval-data)
    - [Response Example](#response-example-3)
  - [Get RP Detail](#get-rp-detail)
    - [Example](#example-5)
- [6. RP Actions](#6-rp-actions)
  - [Step 2 - Manager Department Approve](#step-2-manager-department-approve)
    - [Body](#body-7)
    - [Result](#result)
  - [Step 2 - Manager Department Reject](#step-2-manager-department-reject)
    - [Body](#body-8)
    - [Result](#result-1)
  - [Step 3 - Processor Check Without Changes](#step-3-processor-check-without-changes)
    - [Body](#body-9)
    - [Result](#result-2)
  - [Step 3 - Processor Update RP](#step-3-processor-update-rp)
    - [Body](#body-10)
    - [Result](#result-3)
  - [Step 3 - Processor Revert](#step-3-processor-revert)
    - [Body](#body-11)
    - [Result](#result-4)
  - [Step 3 - Processor Reject](#step-3-processor-reject)
    - [Body](#body-12)
    - [Result](#result-5)
  - [Step 4 - Processor Manager Approve Final](#step-4-processor-manager-approve-final)
    - [Body](#body-13)
    - [Result](#result-6)
  - [Step 4 - Processor Manager Revert](#step-4-processor-manager-revert)
    - [Body](#body-14)
    - [Result](#result-7)
  - [Step 4 - Processor Manager Reject](#step-4-processor-manager-reject)
    - [Body](#body-15)
    - [Result](#result-8)
- [7. Dashboard / Laporan](#7-dashboard-laporan)
  - [Dashboard Data](#dashboard-data)
  - [Laporan FRP](#laporan-frp)
  - [Laporan RP](#laporan-rp)
- [8. PDF](#8-pdf)
  - [Preview FRP PDF](#preview-frp-pdf)
  - [Generate FRP PDF](#generate-frp-pdf)
  - [Preview RP PDF](#preview-rp-pdf)
  - [Generate RP PDF](#generate-rp-pdf)
- [9. Notes untuk FE](#9-notes-untuk-fe)
  - [Field naming](#field-naming)
    - [FRP field utama](#frp-field-utama)
    - [RP field utama](#rp-field-utama)
  - [Items format](#items-format)
  - [Status FRP](#status-frp)
  - [Status RP](#status-rp)
  - [Department / Budget Access](#department-budget-access)


Base URL development:

```txt
http://localhost:3000
```

Authentication sementara development menggunakan session dari backend. FE tidak perlu login manual jika `DEV_AUTH_ENABLED=true`.

---

# 1. Auth / User Session

## Get Current User

```http
GET /api/user/info
```

### Response Example

```json
{
  "id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
  "username": "azi",
  "fullName": "Azi Fauzi",
  "role": "administrator",
  "companyId": "comp-pnm-0001",
  "companyCode": "PNM",
  "companyName": "PT Pilar Niaga Makmur",
  "departmentId": 8,
  "departmentName": "IT",
  "departmentClass": "IT",
  "departmentCode": "SIT",
  "jobLevelName": "Staff",
  "jobLevelRank": 1,
  "allAssignments": []
}
```

Catatan untuk approval FRP:

- Akses approve/reject aktif untuk role manager ke atas.
- `Manager` hanya bisa melihat dan approve FRP dari divisinya sendiri.
- `Administrator`, `IT`, `Direktur`, dan `Komisaris` tetap bisa approve lintas divisi.

---

# 2. Master Data

## Get Form Data FRP

```http
GET /api/form-data
```

Digunakan untuk kebutuhan form FRP.

### Response berisi data seperti:

```json
{
  "user": {},
  "employees": [],
  "departments": [],
  "companies": [],
  "vendors": [],
  "budgets": []
}
```

---

## Get Form Data RP

```http
GET /api/rp/form-data
```

Digunakan untuk kebutuhan form RP.

### Response berisi data seperti:

```json
{
  "user": {},
  "employees": [],
  "departments": [],
  "companies": [],
  "budgets": []
}
```

---

# 3. Master Budgets

## Get All Budgets

```http
GET /api/budgets
```

### Response Example

```json
[
  {
    "id": "PRO2626",
    "departmentId": 13,
    "departmentName": "Product",
    "departmentClass": "Product",
    "departmentCode": "PRO",
    "projectName": "6001.01.00 - Biaya Iklan",
    "budgetType": "Cost",
    "budgetAmount": 500000000,
    "budgetUsed": 100000,
    "budgetRemaining": 499900000,
    "isActive": true,
    "createdAt": "2026-05-26T00:00:00.000Z",
    "updatedAt": "2026-05-26T00:00:00.000Z"
  }
]
```

---

## Create Budget

```http
POST /api/budgets
```

### Body

```json
{
  "id": "PRO2604",
  "departmentId": 13,
  "departmentName": "Product",
  "departmentClass": "Product",
  "departmentCode": "PRO",
  "projectName": "6002.02.00 - Test Budget",
  "budgetType": "Cost",
  "budgetAmount": 10000000
}
```

### Response

```json
{
  "success": true,
  "id": "PRO2604"
}
```

---

## Update Budget

```http
PUT /api/budgets/:id
```

### Example

```http
PUT /api/budgets/PRO2604
```

### Body

```json
{
  "departmentId": 13,
  "departmentName": "Product",
  "departmentClass": "Product",
  "departmentCode": "PRO",
  "projectName": "6002.02.00 - Test Budget Updated",
  "budgetType": "Cost",
  "budgetAmount": 15000000,
  "isActive": true
}
```

### Response

```json
{
  "success": true,
  "id": "PRO2604"
}
```

---

## Delete / Deactivate Budget

```http
DELETE /api/budgets/:id
```

### Example

```http
DELETE /api/budgets/PRO2604
```

### Response

```json
{
  "success": true,
  "id": "PRO2604"
}
```

---

# 4. FRP

## Create FRP

```http
POST /api/frp/save
```

Notes:

- Data user, company, department, dan job level diambil dari auth/session backend.
- FE tidak perlu kirim `companyId`, `departmentId`, atau `createdByUserId`.
- Items akan disimpan ke tabel `items_frp`.
- Budget akan otomatis mengurangi `budget_remaining`.

### Body

```json
{
  "frpDate": "2026-05-26",
  "currency": "IDR",
  "exchangeRate": "1",
  "frpDescription": "Test create FRP multi items using real budget",
  "vendor": "Vendor Test Multi Budget",
  "internalPoNumber": "PO-TEST-MULTI-001",
  "externalDocumentType": "Invoice",
  "externalDocumentNumber": "INV-TEST-MULTI-001",
  "paymentMethod": "Transfer",
  "paymentDate": "2026-05-30",
  "destinationBank": "BCA",
  "destinationBankAccount": "1234567890",
  "checkDocs": ["Invoice", "PO", "Faktur Pajak"],
  "items": [
    {
      "budgetId": "PRO2626",
      "memo": "Test item budget PRO2626",
      "qty": 1,
      "price": 100000,
      "amount": 100000
    },
    {
      "budgetId": "PRO2627",
      "memo": "Test item budget PRO2627",
      "qty": 2,
      "price": 75000,
      "amount": 150000
    },
    {
      "budgetId": "PRO2628",
      "memo": "Test item budget PRO2628",
      "qty": 3,
      "price": 50000,
      "amount": 150000
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "id": "uuid-frp-request",
  "frpNo": "FRP-SIT-26-00001"
}
```

---

## Update / Revision FRP

```http
POST /api/frp/save
```

Untuk update, kirim `frpId`.

### Body

```json
{
  "frpId": "uuid-frp-request",
  "frpDate": "2026-05-26",
  "currency": "IDR",
  "exchangeRate": "1",
  "frpDescription": "Update FRP description",
  "vendor": "Vendor Updated",
  "internalPoNumber": "PO-UPDATED-001",
  "externalDocumentType": "Invoice",
  "externalDocumentNumber": "INV-UPDATED-001",
  "paymentMethod": "Transfer",
  "paymentDate": "2026-05-30",
  "destinationBank": "BCA",
  "destinationBankAccount": "1234567890",
  "checkDocs": ["Invoice", "PO"],
  "items": [
    {
      "budgetId": "PRO2626",
      "memo": "Updated item",
      "qty": 2,
      "price": 100000,
      "amount": 200000
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "id": "uuid-frp-request",
  "frpNo": "FRP-SIT-26-00001"
}
```

---

## Get FRP Approval Data

```http
GET /api/data/approval
```

Digunakan untuk list approval/status FRP.

### Response Example

```json
{
  "requests": [
    {
      "id": "uuid-frp-request",
      "frpNo": "FRP-SIT-26-00001",
      "status": "PENDING",
      "companyId": "comp-pnm-0001",
      "companyCode": "PNM",
      "companyName": "PT Pilar Niaga Makmur",
      "departmentId": 8,
      "departmentName": "IT",
      "departmentClass": "IT",
      "departmentCode": "SIT",
      "frpDate": "2026-05-26",
      "requestedBy": "Azi Fauzi",
      "currency": "IDR",
      "exchangeRate": "1",
      "vendor": "Vendor Test",
      "frpDescription": "Description",
      "items": []
    }
  ]
}
```

---

## Get FRP Detail

```http
GET /api/frp/:id
```

### Example

```http
GET /api/frp/uuid-frp-request
```

---

## Approve FRP

```http
POST /api/frp/:id/approve
```

### Example

```http
POST /api/frp/uuid-frp-request/approve
```

### Body

```json
{}
```

### Response

```json
{
  "success": true
}
```

---

## Reject FRP

```http
POST /api/frp/:id/reject
```

### Example

```http
POST /api/frp/uuid-frp-request/reject
```

### Body

```json
{
  "reason": "Dokumen belum lengkap"
}
```

### Response

```json
{
  "success": true
}
```

---

# 5. RP

## RP Flow

### Flow normal untuk department selain IT/HCGA

```txt
Create RP
→ waiting_manager
→ manager-approve
→ division_review
→ process-direct / process-update
→ final_review
→ process-manager-approve
→ approved
```

### Flow khusus jika creator adalah IT/HCGA

```txt
Create RP
→ final_review
→ process-manager-approve
→ approved
```

### Reject rule

Jika reject di step manapun:

```txt
status = REJECTED
```

dan RP tidak bisa diproses lagi.

### Revert rule

```txt
process-revert           = step 3 balik ke step 1 / waiting_manager
process-manager-revert   = step 4 balik ke step 3 / division_review
```

---

## Create RP

```http
POST /api/rp/save
```

Notes:

- Data user, company, department, dan job level diambil dari auth/session backend.
- Items disimpan ke tabel `items_rp`.
- `processedByDepartment` wajib untuk creator selain IT/HCGA.
- `processedByDepartment` harus department yang aktif di policy `budget_access_policies` dengan `module = RP` dan `flow = PROCESS`.
- Jika creator adalah IT/HCGA, status awal langsung `final_review`.

### Body untuk department biasa

```json
{
  "purchaseCategory": "IT Equipment",
  "description": "Pengajuan pembelian laptop untuk kebutuhan operasional",
  "processedByDepartment": "IT",
  "requiredDate": "2026-06-10",
  "vendorSuggestion": "Vendor RP Test",
  "receiverPic": "Azi Fauzi",
  "items": [
    {
      "budgetId": "PRO2626",
      "memo": "Laptop replacement",
      "qty": 1,
      "price": 100000,
      "amount": 100000
    },
    {
      "budgetId": "PRO2627",
      "memo": "Peripheral equipment",
      "qty": 2,
      "price": 50000,
      "amount": 100000
    }
  ]
}
```

### Body untuk creator IT/HCGA

```json
{
  "purchaseCategory": "IT Equipment",
  "description": "Pengajuan internal IT",
  "requiredDate": "2026-06-10",
  "vendorSuggestion": "Vendor RP Test",
  "receiverPic": "Azi Fauzi",
  "items": [
    {
      "budgetId": "PRO2626",
      "memo": "Laptop replacement",
      "qty": 1,
      "price": 100000,
      "amount": 100000
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "rpNo": "RP-SIT-26-00001",
  "id": "uuid-rp-request"
}
```

---

## Update / Revision RP

```http
POST /api/rp/save
```

Untuk update, kirim `rpId`.

### Body

```json
{
  "rpId": "uuid-rp-request",
  "purchaseCategory": "IT Equipment Updated",
  "description": "Update pengajuan pembelian",
  "processedByDepartment": "IT",
  "requiredDate": "2026-06-15",
  "vendorSuggestion": "Vendor Updated",
  "receiverPic": "Azi Fauzi",
  "items": [
    {
      "budgetId": "PRO2628",
      "memo": "Updated item",
      "qty": 2,
      "price": 100000,
      "amount": 200000
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "rpNo": "RP-SIT-26-00001",
  "id": "uuid-rp-request"
}
```

---

## Get RP Approval Data

```http
GET /api/data/rp-approval
```

Digunakan untuk list approval/status RP.

### Response Example

```json
{
  "requests": [
    {
      "id": "uuid-rp-request",
      "rpNo": "RP-SIT-26-00001",
      "status": "waiting_manager",
      "companyId": "comp-pnm-0001",
      "companyCode": "PNM",
      "companyName": "PT Pilar Niaga Makmur",
      "departmentId": 8,
      "departmentName": "IT",
      "departmentClass": "IT",
      "departmentCode": "SIT",
      "requestedBy": "Azi Fauzi",
      "purchaseCategory": "IT Equipment",
      "description": "Pengajuan pembelian",
      "processedByDepartment": "IT",
      "requiredDate": "2026-06-10",
      "vendorSuggestion": "Vendor RP Test",
      "receiverPic": "Azi Fauzi",
      "items": []
    }
  ]
}
```

---

## Get RP Detail

```http
GET /api/rp/:id
```

### Example

```http
GET /api/rp/uuid-rp-request
```

---

# 6. RP Actions

## Step 2 - Manager Department Approve

```http
POST /api/rp/:id/manager-approve
```

### Body

```json
{}
```

### Result

```txt
waiting_manager → division_review
```

---

## Step 2 - Manager Department Reject

```http
POST /api/rp/:id/manager-reject
```

### Body

```json
{
  "reason": "Budget tidak sesuai kebutuhan department"
}
```

### Result

```txt
waiting_manager → REJECTED
```

---

## Step 3 - Processor Check Without Changes

Dipakai oleh IT/HCGA jika RP sudah sesuai dan tidak perlu perubahan.

```http
POST /api/rp/:id/process-direct
```

### Body

```json
{
  "note": "RP sudah sesuai, lanjut approval Manager IT."
}
```

### Result

```txt
division_review → final_review
```

---

## Step 3 - Processor Update RP

Dipakai oleh IT/HCGA jika perlu edit RP. Perubahan akan disimpan di `process_changes`.

```http
POST /api/rp/:id/process-update
```

### Body

```json
{
  "note": "Qty dan memo disesuaikan oleh tim IT.",
  "vendorSuggestion": "Vendor RP Updated",
  "requiredDate": "2026-06-15",
  "receiverPic": "Azi Fauzi Updated",
  "description": "Description updated by IT checker",
  "items": [
    {
      "budgetId": "PRO2626",
      "memo": "Updated laptop replacement",
      "qty": 2,
      "price": 100000,
      "amount": 200000
    },
    {
      "budgetId": "PRO2628",
      "memo": "Additional accessory",
      "qty": 1,
      "price": 75000,
      "amount": 75000
    }
  ]
}
```

### Result

```txt
division_review → final_review
```

---

## Step 3 - Processor Revert

Dipakai oleh IT/HCGA untuk mengembalikan RP ke manager department pemohon.

```http
POST /api/rp/:id/process-revert
```

### Body

```json
{
  "reason": "Kebutuhan belum jelas, mohon review ulang oleh department pemohon."
}
```

### Result

```txt
division_review → waiting_manager
```

---

## Step 3 - Processor Reject

```http
POST /api/rp/:id/process-reject
```

### Body

```json
{
  "reason": "Spesifikasi tidak sesuai standar IT."
}
```

### Result

```txt
division_review → REJECTED
```

---

## Step 4 - Processor Manager Approve Final

Dipakai oleh Manager IT/HCGA.

```http
POST /api/rp/:id/process-manager-approve
```

### Body

```json
{}
```

### Result

```txt
final_review → approved
```

---

## Step 4 - Processor Manager Revert

Dipakai oleh Manager IT/HCGA untuk mengembalikan RP ke tim processor IT/HCGA.

```http
POST /api/rp/:id/process-manager-revert
```

### Body

```json
{
  "reason": "Perubahan item belum sesuai, dikembalikan ke tim IT untuk review ulang."
}
```

### Result

```txt
final_review → division_review
```

---

## Step 4 - Processor Manager Reject

```http
POST /api/rp/:id/process-manager-reject
```

### Body

```json
{
  "reason": "Final approval ditolak oleh Manager IT."
}
```

### Result

```txt
final_review → REJECTED
```

---

# 7. Dashboard / Laporan

## Dashboard Data

```http
GET /api/data/dashboard
```

Digunakan untuk summary dashboard FRP/RP.

---

## Laporan FRP

```http
GET /api/data/laporan
```

---

## Laporan RP

```http
GET /api/data/laporan-rp
```

---

# 8. PDF

## Preview FRP PDF

```http
POST /preview
```

Body mengikuti data FRP yang ingin dipreview.

---

## Gefrrate FRP PDF

```http
POST /generate-pdf
```

Body mengikuti data FRP yang ingin digenerate.

---

## Preview RP PDF

```http
GET /api/rp/:id/preview
```

---

## Generate RP PDF

```http
GET /api/rp/:id/pdf
```

---

# 9. Notes untuk FE

## Field naming

Backend sekarang menggunakan English field.

### FRP field utama

```txt
frpDate
requestedBy
frpDescription
destinationBank
destinationBankAccount
exchangeRate
externalDocumentType
externalDocumentNumber
items
```

### RP field utama

```txt
requestedBy
purchaseCategory
description
processedByDepartment
requiredDate
vendorSuggestion
receiverPic
items
```

---

## Items format

Format item untuk FRP dan RP sama:

```json
{
  "budgetId": "PRO2626",
  "memo": "Item memo",
  "qty": 1,
  "price": 100000,
  "amount": 100000
}
```

---

## Status FRP

```txt
PENDING
APPROVED
REJECTED
```

---

## Status RP

```txt
waiting_manager
division_review
final_review
approved
REJECTED
```

---

## Department / Budget Access

Budget access diatur dari tabel:

```txt
budget_access_policies
```

Rule saat ini:

```txt
FRP CREATE:
- IT
- HCGA
- Product
- Marketing

RP CREATE:
- IT
- HCGA

RP PROCESS:
- IT
- HCGA
```

Jika department user tidak punya akses cross budget, maka user hanya boleh menggunakan budget dari department sendiri.

---

## 5. Admin / Master Data

### Get Admin Data
```http
GET /api/data/admin?type=vendors
GET /api/data/admin?type=budgets
```
Berfungsi untuk mengambil list data (misal list `vendors` dari `vendors.json` atau budgets dari tabel `master_budgets`). Data dikembalikan dalam properti `listData`.

### Create Admin Data
```http
POST /api/admin/:type/add
```
Contoh parameter `:type` adalah `vendors` atau `budgets`. Untuk `vendors`, data disimpan ke `vendors.json`.
**Body untuk vendors**:
```json
{
  "name": "Nama Vendor",
  "bank": "Nama Bank",
  "no_rekening": "12345"
}
```

### Delete Admin Data
```http
POST /api/admin/:type/delete/:index
```
Untuk vendors, index mengacu pada posisi (indeks array) di dalam file `vendors.json`.

### Edit Admin Data
```http
POST /api/admin/:type/edit/:index
```
Mengubah data berdasarkan original index array di json.
