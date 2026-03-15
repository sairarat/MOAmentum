# 📑 NEU MOAmentum: MOA Monitoring System

**NEU MOAmentum** is a dedicated monitoring platform designed for **New Era University** to track the lifecycle and approval status of Memorandums of Agreement (MOAs). The system provides a centralized hub for students, faculty, and administrators to view active partnerships while ensuring a secure, audited workflow for MOA maintenance.

---

## 🎯 Project Goal

To create a secure, role-based monitoring application that tracks MOAs from the initial draft and legal review stages through to final presidential signature and notarization, providing transparency and data-driven insights for university stakeholders.

---

## ✨ Core Features

### 👥 Multi-Tier Access Control
* **Student Dashboard:** View-only access to strictly **APPROVED** MOAs. Students see essential contact and location data for active partners.
* **Faculty/Maintainer Dashboard:** Granted "Maintainer" rights by Admins to Add, Edit, or Soft-Delete MOA entries. Faculty see all active rows but cannot view internal audit trails.
* **Admin Command Center:** Full visibility of all rows (including deleted ones). Admins manage user permissions, recover soft-deleted entries, and monitor the system-wide Audit Trail.

### 🔄 MOA Status Lifecycle
The system tracks the following granular statuses to ensure clear communication:
* **APPROVED:** Signed by President | On-going notarization | No notarization needed.
* **PROCESSING:** Awaiting HTE partner signature | Sent to Legal Office for Review | Sent to VPAA/OP for approval.

### 📊 Admin Intelligence & Audit
* **Real-time Stats:** Dashboard cards showing counts for Active, Under Process, and Expired MOAs.
* **Advanced Filtering:** Filter statistics by College or specific Date Periods.
* **Deep Search:** A global search bar covering College, Industry type, Contact Person, and Company details.
* **Audit Trail:** Admin-only view of **Who, What, and When**—tracking every insert, edit, and deletion.

---

## 🛠️ Technical Requirements

| Requirement | Specification |
| :--- | :--- |
| **Authentication** | Google OAuth 2.0 (Strictly `@neu.edu.ph` domain) |
| **User Roles** | Student, Faculty, Admin |
| **Data Integrity** | **Soft Deletes Only:** No hard deletion of MOA records |
| **Security** | Admin-led User Blocking and "Maintainer" privilege assignment |
| **Search** | Multi-parameter query (Company, Address, Industry, etc.) |

---

## 📂 MOA Entry Schema

Each entry in the system tracks the following data points:
* **HTEID / Company Name / Address**
* **Contact Person & Email**
* **Effective Date & Status**
* **Audit Trail:** (User Name, Date, Time, Operation Type) — *Admin View Only*

---

## 🚀 Installation & Setup

Follow these steps to set up the environment:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/sairarat/MOAmentum.git](https://github.com/sairarat/MOAmentum.git)
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd moa-management-system
    ```

3.  **Enter the application folder:**
    ```bash
    cd gatekeeper-app
    ```

4.  **Install dependencies:**
    ```bash
    npm install
    ```

5.  **Configure Environment Variables:**
    Create a `.env.local` file in the `gatekeeper-app` folder:
    ```env
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_id
    NEXT_PUBLIC_DATABASE_URL=your_db_connection_string
    ```

6.  **Run the development server:**
    ```bash
    npm run dev
    ```

---
*Developed for New Era University — Ensuring partnership transparency and institutional accountability.*
