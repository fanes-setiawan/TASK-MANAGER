"use client";

import React from "react";
import styles from "./support.module.css";

export default function SupportPage() {
  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Help & Support</h2>
          <p className={styles.subtitle}>Need assistance? Find answers to common questions or contact our support team.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* FAQ Section */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>quiz</span>
            Frequently Asked Questions
          </h3>
          
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>How is the Estimated Cost calculated?</div>
            <div className={styles.faqAnswer}>
              The cost is calculated by multiplying the total Story Points (pts) of all modules in your JSON scope by the "Rate/Point" you define in the form or settings.
            </div>
          </div>
          
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>Can I change my default Rate/Point?</div>
            <div className={styles.faqAnswer}>
              Yes, you can update your default Rate/Point in the Settings menu. This will automatically apply to all new projects you create.
            </div>
          </div>
          
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>How do I add my Agency Logo to the proposal?</div>
            <div className={styles.faqAnswer}>
              After generating a proposal, you can click "Upload Logo" in the right sidebar of the Proposal Preview page. Alternatively, you can set a default logo in your Settings.
            </div>
          </div>
          
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>Why is the JSON editor showing an error?</div>
            <div className={styles.faqAnswer}>
              Ensure your JSON is perfectly formatted. It must start and end with curly braces `{}` or brackets `[]`, and all string keys must use double quotes `" "`.
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>support_agent</span>
            Contact Us
          </h3>
          
          <div className={styles.contactMethod}>
            <div className={styles.contactIcon}>
              <span className="material-symbols-outlined">mail</span>
            </div>
            <div>
              <div className={styles.contactTitle}>Email Support</div>
              <div className={styles.contactDesc}>Our team usually responds within 24 hours.</div>
              <a href="mailto:support@taskmanager.com" className={styles.contactLink}>support@taskmanager.com</a>
            </div>
          </div>
          
          <div className={styles.contactMethod}>
            <div className={styles.contactIcon}>
              <span className="material-symbols-outlined">forum</span>
            </div>
            <div>
              <div className={styles.contactTitle}>Live Chat</div>
              <div className={styles.contactDesc}>Available Monday to Friday, 9am - 5pm.</div>
              <a href="#" className={styles.contactLink} onClick={(e) => { e.preventDefault(); alert('Chat widget coming soon!'); }}>Start a Chat</a>
            </div>
          </div>
          
          <div className={styles.contactMethod}>
            <div className={styles.contactIcon}>
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div>
              <div className={styles.contactTitle}>Documentation</div>
              <div className={styles.contactDesc}>Read our detailed guides and API references.</div>
              <a href="#" className={styles.contactLink}>View Docs</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
