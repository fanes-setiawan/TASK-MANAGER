"use client";

import React from "react";
import styles from "./templates.module.css";
import { useRouter } from "next/navigation";

const templates = [
  {
    id: "t1",
    name: "E-Commerce App MVP",
    desc: "Standard e-commerce flow including auth, product catalog, cart, and payment gateway integration.",
    icon: "shopping_cart",
    modules: 5
  },
  {
    id: "t2",
    name: "Company Profile Website",
    desc: "Corporate landing page with CMS integration for blog and portfolio management.",
    icon: "web",
    modules: 3
  },
  {
    id: "t3",
    name: "ERP System (Core)",
    desc: "Internal dashboard with user roles, inventory tracking, and sales analytics.",
    icon: "domain",
    modules: 8
  },
  {
    id: "t4",
    name: "SaaS Platform",
    desc: "Multi-tenant architecture with subscription billing, user management, and core features.",
    icon: "cloud",
    modules: 6
  },
  {
    id: "t5",
    name: "Fintech Mobile App",
    desc: "High-security banking app with KYC, wallet, transfers, and transaction history.",
    icon: "account_balance",
    modules: 7
  },
  {
    id: "t6",
    name: "Custom API Service",
    desc: "Backend-only RESTful API with documentation, rate limiting, and webhook support.",
    icon: "api",
    modules: 4
  }
];

export default function TemplatesPage() {
  const router = useRouter();

  const handleUseTemplate = (templateName: string) => {
    // In a real app, we'd pass the JSON template via global state or query params.
    alert(`Template "${templateName}" selected! Redirecting to New Project...`);
    router.push('/dashboard/new-project');
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Project Templates</h2>
          <p className={styles.subtitle}>Save time by using pre-configured JSON scopes for common project types.</p>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btnPrimary} onClick={() => alert("Create template coming soon!")}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Create Template
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {templates.map((tpl) => (
          <div className={styles.templateCard} key={tpl.id}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <span className="material-symbols-outlined">{tpl.icon}</span>
              </div>
              <button className={styles.btnIcon} onClick={() => alert("Edit template")}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-outline)" }}>more_vert</span>
              </button>
            </div>
            
            <h3 className={styles.templateName}>{tpl.name}</h3>
            <p className={styles.templateDesc}>{tpl.desc}</p>
            
            <div className={styles.cardFooter}>
              <span className={styles.moduleCount}>{tpl.modules} Modules</span>
              <button className={styles.btnUse} onClick={() => handleUseTemplate(tpl.name)}>
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
