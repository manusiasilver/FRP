# API Routes Documentation

## Auth Routes (`/auth.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/login` | Login page |
| POST | `/login` | Login submit |
| GET | `/select-company` | Company selection page |
| POST | `/select-company` | Save selected company |
| GET | `/select-division` | Division selection page |
| POST | `/select-division` | Save selected division |
| GET | `/logout` | Logout |
| POST | `/api/auth/login` | API login |
| GET | `/api/data/select-company` | Get available companies |
| POST | `/api/auth/select-company` | API select company |
| GET | `/api/data/select-division` | Get available divisions |
| POST | `/api/auth/select-division` | API select division |

## FRP Routes (`/frp.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/` | Home page |
| GET | `/frp` | FRP list page |
| GET | `/frp/:id` | FRP detail page |
| GET | `/approval` | FRP approval page |
| GET | `/approved` | FRP approved list page |
| GET | `/status_frp` | FRP status page |
| GET | `/api/form-data` | Get form data (employees, budgets, vendors) |
| GET | `/api/company` | Get company info |
| GET | `/api/user/departement` | Get user department |
| GET | `/api/vendors` | Get all vendors |
| GET | `/api/budgets/all` | Get all budgets |
| GET | `/api/employees` | Get all employees |
| GET | `/api/user/info` | Get current user info |
| GET | `/api/departments/all` | Get all departments |
| GET | `/api/employees/:department` | Get employees by department |
| GET | `/api/budgets/:department` | Get budgets by department |
| GET | `/api/departments` | Get departments list |
| GET | `/api/job-levels` | Get job levels |
| GET | `/api/managers/:department` | Get managers by department |
| GET | `/api/kurs/:currency` | Get currency rate |
| GET | `/api/next-frp-number/:department` | Get next FRP number |
| GET | `/api/data/approval` | Get FRP approval data |
| GET | `/api/frp/:id` | Get FRP detail |
| POST | `/api/frp/save` | Save new FRP |
| POST | `/api/frp/:id/:action` | FRP action (approve/reject/etc) |
| POST | `/api/frp/:id/attachment` | FRP action (approve/reject/etc) |
| GET | `/api/frp/:id/attachment` | FRP action (approve/reject/etc) |
| DELETE | `/api/frp/:id/attachment` | FRP action (approve/reject/etc) |



## RP Routes (`/rp.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/rp` | RP list page |
| GET | `/rp/:id` | RP detail page |
| GET | `/rp-approval` | RP approval page |
| GET | `/rp-approved` | RP approved list page |
| GET | `/api/rp/form-data` | Get RP form data |
| GET | `/api/rp/next-number/:department` | Get next RP number |
| GET | `/api/rp/processor-departments` | Get processor departments |
| GET | `/api/data/rp-approval` | Get RP approval data |
| GET | `/api/rp/:id` | Get RP detail |
| POST | `/api/rp/save` | Save new RP |
| POST | `/api/rp/:id/:action` | RP action (approve/reject/etc) |

## PDF Routes (`/pdf.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/history` | PDF history page |
| GET | `/api/data/history` | Get PDF history data |
| POST | `/generate-pdf` | Generate PDF |
| POST | `/print-pdf` | Print FRP PDF from request body |
| GET | `/api/frp/:id/print` | Print FRP PDF |
| GET | `/api/frp/:id/pdf` | Get FRP PDF |
| GET | `/api/rp/:id/print` | Print RP PDF |
| GET | `/api/rp/:id/pdf` | Get RP PDF |

## Laporan Routes (`/laporan.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/laporan` | Report page |
| GET | `/api/data/laporan` | Get FRP report data |
| GET | `/api/data/laporan-rp` | Get RP report data |
| POST | `/api/laporan/pdf` | Generate report PDF |

## Dashboard Routes (`/dashboard.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/dashboard` | Dashboard page |
| GET | `/api/data/dashboard` | Get dashboard data |

## Admin Routes (`/admin.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/admin/:type` | Admin page (departments/companies/vendors) |
| GET | `/api/data/admin` | Get admin data |
| POST | `/api/admin/:type/add` | Add new admin item |
| POST | `/api/admin/:type/delete/:index` | Delete admin item |
| POST | `/api/admin/:type/edit/:index` | Edit admin item |

## Budget Routes (`/budget.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/api/budgets` | Get all budgets |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Delete budget |

## Document Routes (`/document.js`)
| Method | Endpoint | Desc |
|--------|----------|------|
| GET | `/document/generate` | Document generator page |
| GET | `/document/riwayat` | Document history page |
| GET | `/document/template` | Document template page |
| GET | `/api/document/master-departments` | Get master departments |
| GET | `/api/document/templates` | Get available templates |
| POST | `/api/document/templates/upload` | Upload template |
| DELETE | `/api/document/templates/:name` | Delete template |
| GET | `/api/document/documents` | Get documents |
| POST | `/api/document/generate` | Generate document |
| PUT | `/api/document/documents/:id` | Update document |
| POST | `/api/document/download` | Download document |

