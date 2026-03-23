# MOAmentum
A Memorandum of Agrement(MOA) Management System in tracking the status of Internship MOA 

# Submission Navigation 
- **Email** - jcesperanza@neu.edu.ph
- **Password** - esperanzaJC@neu.edu.ph
- **Live Link** - https://mo-amentum-opu1.vercel.app/signin 


---

## ✨ Core Features

### 👥 Multi-Tier Access Control
* **Student Dashboard:** View-only access to strictly **APPROVED** MOAs. Students see essential contact and location data for active partners.
* **Faculty/Maintainer Dashboard:** Granted "Maintainer" rights by Admins to Add, Edit, or Soft-Delete MOA entries. Faculty see all active rows but cannot view internal audit trails.
* **Admin Command Center:** Full visibility of all rows (including deleted ones). Admins manage user permissions, recover soft-deleted entries, and monitor the system-wide Audit Trail.
* 

### 🔄 MOA Status Lifecycle
The system tracks the following granular statuses to ensure clear communication:
* **APPROVED:** Signed by President | On-going notarization | No notarization needed.
* **PROCESSING:** Awaiting HTE partner signature | Sent to Legal Office for Review | Sent to VPAA/OP for approval.

### 📊 Admin Intelligence & Audit
* **Real-time Stats:** Dashboard cards showing counts for Active, Under Process, and Expired MOAs.
@@ -30,6 +34,8 @@ The system tracks the following granular statuses to ensure clear communication:

---


## 🛠️ Technical Requirements

| Requirement | Specification |
@@ -66,17 +72,12 @@ Follow these steps to set up the environment:
    cd moa-management-system
    ```

3.  **Install dependencies:**





    ```bash
    npm install
    ```

4.  **Configure Environment Variables:**
    Create a `.env.local` file in the `moa-management-system` folder:
    ```env
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_id
    ```

---
*Developed in requirement for Professional Elective 2 MOA Status Management System: New Era University — Ensuring partnership transparency and institutional accountability.*
